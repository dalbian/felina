// Lógica del calendario: materialización de turnos a partir de plantillas
// recurrentes, detección de turnos pasados, franjas horarias simplificadas.

import { ymd, addDays } from './dates.js';

// Franjas del día. Decisión de producto en fase piloto: la gente del pueblo no
// necesita precisión de minutos — "Mañana" / "Tarde" basta. Si hace falta más
// granularidad (mediodía, noche…) se amplía aquí.
// El campo `icon` queda vacío: los componentes de presentación asocian el
// icono correspondiente de lucide-react según el slot.
export const SHIFT_SLOT_META = {
  morning:   { label: 'Mañana', short: 'Mañana', order: 0, color: '#8A6B1F', bg: '#FDF4DE' },
  afternoon: { label: 'Tarde',  short: 'Tarde',  order: 1, color: '#B15A3A', bg: '#F5DDCE' },
};

// Convierte una hora "HH:MM" heredada al slot correspondiente. Corte a las 14:00.
// Se conserva para la migración 5 (time → slot) y para cualquier plantilla/turno
// que aún no tenga slot tras actualización.
export const slotFromTime = (time) => {
  if (!time) return 'morning';
  const hh = parseInt(String(time).split(':')[0], 10);
  return Number.isFinite(hh) && hh >= 14 ? 'afternoon' : 'morning';
};

export const slotOrder = (slot) => SHIFT_SLOT_META[slot]?.order ?? 0;

// Un turno se considera pasado únicamente cuando su fecha es anterior a hoy.
// Antes se usaba la hora exacta; con franjas basta con el día: hace la app más
// permisiva (un turno de mañana puede cubrirse aún por la tarde).
export const isShiftPast = (shift, todayYmdValue) => shift.date < todayYmdValue;

// Dado un rango [fromDate, toDate] (ambos inclusive, Date locales) y una lista
// de plantillas activas, materializa turnos "virtuales" para cada día que
// encaje con daysOfWeek. Luego fusiona con las instancias reales de `shifts`
// (match por templateId + date + slot). Los ad-hoc (sin template) se incluyen
// directamente. Devuelve array ordenado por fecha + franja.
export const computeShifts = ({ templates, shifts, colonyIds, from, to }) => {
  const out = [];
  const realByKey = {};
  const adHoc = [];
  const dateSet = new Set();
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) dateSet.add(ymd(d));

  for (const sh of shifts) {
    if (colonyIds && !colonyIds.has(sh.colonyId)) continue;
    if (!dateSet.has(sh.date)) continue;
    if (sh.templateId) {
      const slot = sh.slot || slotFromTime(sh.time);
      realByKey[`${sh.templateId}|${sh.date}|${slot}`] = sh;
    } else {
      adHoc.push(sh);
    }
  }

  for (const t of templates) {
    if (!t.active) continue;
    if (colonyIds && !colonyIds.has(t.colonyId)) continue;
    const tplSlot = t.slot || slotFromTime(t.time);
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      if (!t.daysOfWeek.includes(d.getDay())) continue;
      const dateStr = ymd(d);
      const key = `${t.id}|${dateStr}|${tplSlot}`;
      const real = realByKey[key];
      if (real) {
        out.push({ ...real, slot: real.slot || tplSlot, _virtual: false, _template: t });
      } else {
        out.push({
          id: `v:${key}`, _virtual: true, _template: t,
          orgId: t.orgId, colonyId: t.colonyId, templateId: t.id,
          date: dateStr, slot: tplSlot, task: t.task, status: 'open',
          notes: '',
        });
      }
    }
  }
  for (const sh of adHoc) {
    out.push({ ...sh, slot: sh.slot || slotFromTime(sh.time), _virtual: false, _template: null });
  }

  out.sort((a, b) =>
    a.date === b.date ? slotOrder(a.slot) - slotOrder(b.slot) : a.date.localeCompare(b.date)
  );
  return out;
};
