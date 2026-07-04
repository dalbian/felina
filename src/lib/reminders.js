// Lógica pura de recordatorios médicos. Sin React, sin estado — testeable.
//
// Los recordatorios (`cat_reminders`) tienen `dueDate` como string
// 'YYYY-MM-DD' (DATE puro de Postgres) y `completedAt` (ms o null).
// Comparamos fechas como strings 'YYYY-MM-DD', que ordena
// lexicográficamente igual que cronológicamente.

// Ventana (en días) para considerar un recordatorio "próximo" (ámbar).
// Más allá de esto, no se pinta señal en la tarjeta para no saturar en
// colonias con muchos gatos. El dashboard usa su propia ventana (30d) para
// el widget; aquí el badge significa "requiere atención pronto".
export const SOON_WINDOW_DAYS = 7;

// Suma días a una fecha 'YYYY-MM-DD' y devuelve otra 'YYYY-MM-DD'.
// Local-time safe: construye Date con componentes numéricos (no parseo ISO).
const addDaysYmd = (ymd, n) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Estado de avisos de un gato a partir de SUS recordatorios (ya filtrados
// al gato o no — la función filtra por catId internamente).
//
// Devuelve:
//   'overdue' — tiene algún recordatorio pendiente con dueDate < hoy
//   'soon'    — nada vencido, pero algo vence entre hoy y hoy+7 (incluidos)
//   null      — sin pendientes en la ventana
//
// El rojo (overdue) tiene prioridad sobre el ámbar (soon).
//
// @param {string} catId
// @param {Array}  reminders  lista de recordatorios (con catId, dueDate, completedAt)
// @param {string} todayYmd   fecha de hoy 'YYYY-MM-DD' (inyectada para testear)
export const catReminderStatus = (catId, reminders, todayYmd) => {
  const horizon = addDaysYmd(todayYmd, SOON_WINDOW_DAYS);
  let hasOverdue = false;
  let hasSoon = false;

  for (const r of reminders) {
    if (r.catId !== catId) continue;
    if (r.completedAt) continue; // ya hecho, no cuenta
    if (!r.dueDate) continue;

    if (r.dueDate < todayYmd) {
      hasOverdue = true;
      // No hacemos break: un overdue ya define el resultado final (rojo),
      // pero seguir el bucle es O(n) igual y mantiene el código simple.
    } else if (r.dueDate <= horizon) {
      hasSoon = true;
    }
  }

  if (hasOverdue) return 'overdue';
  if (hasSoon) return 'soon';
  return null;
};
