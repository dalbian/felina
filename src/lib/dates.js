// Utilidades de fechas para el calendario y formateos generales.
// Trabajamos siempre en zona horaria local (la del navegador del voluntario).

// Date | timestamp → 'YYYY-MM-DD' (sin hora, local).
export const ymd = (d) => {
  if (typeof d === 'number') d = new Date(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 'YYYY-MM-DD' → Date a medianoche local.
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayYmd = () => ymd(new Date());

export const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

// Lunes como primer día de la semana (formato ES/CAT).
export const startOfWeek = (d) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0 dom … 6 sab
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
};

export const startOfMonth = (d) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(1);
  return r;
};

export const isSameYmd = (a, b) => ymd(a) === ymd(b);

// Formateos de presentación.

export const fmtDate = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtRelative = (ts) => {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  return `hace ${Math.floor(days / 365)} años`;
};

export const fmtDayLong = (d) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtMonth = (d) =>
  new Date(d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

export const fmtWeekday = (d, short = false) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: short ? 'short' : 'long' });
