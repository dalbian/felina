// Utilidades de fechas para el calendario y formateos generales.
// Trabajamos siempre en zona horaria local (la del navegador del voluntario).
//
// Locale dinámico: el sistema i18n llama a setDateLocale() al cambiar de
// idioma. Por defecto castellano; 'ca' → catalán. Solo afecta a los
// formateos de presentación (nombres de mes/día y fmtRelative), no al
// cálculo (ymd, parseYmd, etc., que son neutrales).
let _locale = 'es-ES';
let _isCa = false;
export const setDateLocale = (lang) => {
  _isCa = lang === 'ca';
  _locale = _isCa ? 'ca-ES' : 'es-ES';
};
// Para componentes que necesitan llamar a toLocaleDateString con opciones
// puntuales (rangos, formatos no cubiertos por los helpers fmt*).
export const getDateLocale = () => _locale;

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
  return d.toLocaleDateString(_locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtRelative = (ts) => {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (_isCa) {
    if (days === 0) return 'avui';
    if (days === 1) return 'ahir';
    if (days < 30) return `fa ${days} dies`;
    if (days < 365) return `fa ${Math.floor(days / 30)} mesos`;
    return `fa ${Math.floor(days / 365)} anys`;
  }
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  if (days < 365) return `hace ${Math.floor(days / 30)} meses`;
  return `hace ${Math.floor(days / 365)} años`;
};

export const fmtDayLong = (d) =>
  new Date(d).toLocaleDateString(_locale, { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtMonth = (d) =>
  new Date(d).toLocaleDateString(_locale, { month: 'long', year: 'numeric' });

export const fmtWeekday = (d, short = false) =>
  new Date(d).toLocaleDateString(_locale, { weekday: short ? 'short' : 'long' });

// Día de semana abreviado + número de día (ej. "lun 14" / "dl. 14").
export const fmtShortDay = (d) =>
  new Date(d).toLocaleDateString(_locale, { weekday: 'short', day: '2-digit' });
