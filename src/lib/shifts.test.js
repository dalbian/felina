import { describe, it, expect } from 'vitest';
import { slotFromTime, slotOrder, isShiftPast, computeShifts } from './shifts.js';

describe('slotFromTime', () => {
  it('hora < 14:00 → mañana', () => {
    expect(slotFromTime('08:30')).toBe('morning');
    expect(slotFromTime('13:59')).toBe('morning');
    expect(slotFromTime('00:00')).toBe('morning');
  });
  it('hora >= 14:00 → tarde', () => {
    expect(slotFromTime('14:00')).toBe('afternoon');
    expect(slotFromTime('19:30')).toBe('afternoon');
    expect(slotFromTime('23:45')).toBe('afternoon');
  });
  it('sin hora o invalida → mañana por defecto', () => {
    expect(slotFromTime(null)).toBe('morning');
    expect(slotFromTime(undefined)).toBe('morning');
    expect(slotFromTime('')).toBe('morning');
    expect(slotFromTime('abc')).toBe('morning');
  });
});

describe('slotOrder', () => {
  it('mañana antes que tarde', () => {
    expect(slotOrder('morning')).toBeLessThan(slotOrder('afternoon'));
  });
  it('slot desconocido → 0', () => {
    expect(slotOrder('medianoche')).toBe(0);
    expect(slotOrder(undefined)).toBe(0);
  });
});

describe('isShiftPast', () => {
  it('día anterior a hoy → past', () => {
    expect(isShiftPast({ date: '2026-04-22' }, '2026-04-23')).toBe(true);
  });
  it('hoy → no past (aún puede cubrirse)', () => {
    expect(isShiftPast({ date: '2026-04-23' }, '2026-04-23')).toBe(false);
  });
  it('futuro → no past', () => {
    expect(isShiftPast({ date: '2026-04-24' }, '2026-04-23')).toBe(false);
  });
});

describe('computeShifts', () => {
  // Plantilla: comida todos los días, por la tarde, colonia c1
  const tpl = {
    id: 't1', orgId: 'o1', colonyId: 'c1',
    task: 'alimentacion', slot: 'afternoon',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], active: true,
  };
  const from = new Date(2026, 3, 20); // lunes
  const to = new Date(2026, 3, 22);   // miércoles

  it('genera turnos virtuales para cada día del rango', () => {
    const out = computeShifts({ templates: [tpl], shifts: [], from, to });
    expect(out).toHaveLength(3);
    expect(out.every(s => s._virtual === true)).toBe(true);
    expect(out.map(s => s.date)).toEqual(['2026-04-20', '2026-04-21', '2026-04-22']);
    expect(out.every(s => s.slot === 'afternoon')).toBe(true);
    expect(out.every(s => s.status === 'open')).toBe(true);
  });

  it('fusiona un turno real que hace match (templateId + date + slot)', () => {
    const realShift = {
      id: 's1', orgId: 'o1', colonyId: 'c1', templateId: 't1',
      date: '2026-04-21', slot: 'afternoon', task: 'alimentacion',
      status: 'done', assigneeId: 'u2',
    };
    const out = computeShifts({ templates: [tpl], shifts: [realShift], from, to });
    expect(out).toHaveLength(3);
    const match = out.find(s => s.date === '2026-04-21');
    expect(match._virtual).toBe(false);
    expect(match.status).toBe('done');
    expect(match.assigneeId).toBe('u2');
  });

  it('plantilla inactiva no genera nada', () => {
    const out = computeShifts({ templates: [{ ...tpl, active: false }], shifts: [], from, to });
    expect(out).toHaveLength(0);
  });

  it('filtra por colonia cuando se pasa colonyIds', () => {
    const tpl2 = { ...tpl, id: 't2', colonyId: 'c2' };
    const out = computeShifts({
      templates: [tpl, tpl2], shifts: [],
      colonyIds: new Set(['c2']), from, to,
    });
    expect(out.every(s => s.colonyId === 'c2')).toBe(true);
    expect(out).toHaveLength(3);
  });

  it('respeta daysOfWeek (solo lunes)', () => {
    const out = computeShifts({
      templates: [{ ...tpl, daysOfWeek: [1] }],
      shifts: [], from, to,
    });
    // 2026-04-20 es lunes
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe('2026-04-20');
  });

  it('ordena por fecha y luego por franja (mañana antes que tarde)', () => {
    const tplAM = { ...tpl, id: 'tAM', slot: 'morning' };
    const out = computeShifts({ templates: [tplAM, tpl], shifts: [], from, to });
    // Para cada día: morning antes que afternoon
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i].date === out[i + 1].date) {
        expect(out[i].slot).toBe('morning');
        expect(out[i + 1].slot).toBe('afternoon');
      }
    }
  });

  it('incluye turnos ad-hoc (sin templateId) dentro del rango', () => {
    const adHoc = {
      id: 'sAdHoc', orgId: 'o1', colonyId: 'c1',
      date: '2026-04-21', slot: 'morning', task: 'otros',
      status: 'assigned', assigneeId: 'u3',
    };
    const out = computeShifts({ templates: [], shifts: [adHoc], from, to });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('sAdHoc');
    expect(out[0]._virtual).toBe(false);
    expect(out[0]._template).toBeNull();
  });

  it('turno real con `time` heredado sin `slot` se mapea por slotFromTime', () => {
    const realShift = {
      id: 's1', orgId: 'o1', colonyId: 'c1', templateId: 't1',
      date: '2026-04-21', time: '20:00', task: 'alimentacion',
      status: 'done',
    };
    const out = computeShifts({ templates: [tpl], shifts: [realShift], from, to });
    const match = out.find(s => s.date === '2026-04-21');
    expect(match._virtual).toBe(false);
    expect(match.slot).toBe('afternoon');
  });
});
