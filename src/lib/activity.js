// Registro de actividad: escribe en la tabla `activity_log` una entrada
// por cada mutación relevante (gato añadido, colonia editada, etc.).
// La tabla la creó la migración 0008.
//
// Diseño:
//   - Fire-and-forget: si el insert falla, NO bloqueamos al usuario ni
//     mostramos error. La mutación principal ya ha tenido éxito; el log
//     es accesorio. Solo lo registramos en consola para depuración.
//   - Las claves de `ACTIONS` son strings estables en inglés. El frontend
//     las traduce vía i18n (`activity.action.<key>`). Si añades una clave
//     aquí, recuerda añadirla también en i18n.jsx (ES y CA).
//   - Snapshots: guardamos `userName` y `entityName` para que el log siga
//     siendo legible aunque el usuario o la entidad se borren después.

import { supabase } from './supabaseClient.js';

// Catálogo cerrado de acciones. Útil para evitar typos en los handlers y
// para tener un sitio único donde añadir nuevas categorías.
export const ACTIONS = {
  // Gatos
  CAT_ADDED:           'cat_added',
  CAT_UPDATED:         'cat_updated',
  CAT_STATUS_CHANGED:  'cat_status_changed',
  CAT_DELETED:         'cat_deleted',
  // Colonias
  COLONY_ADDED:        'colony_added',
  COLONY_UPDATED:      'colony_updated',
  COLONY_DELETED:      'colony_deleted',
  // Eventos veterinarios
  EVENT_ADDED:         'event_added',
  EVENT_UPDATED:       'event_updated',
  EVENT_DELETED:       'event_deleted',
  // Recordatorios médicos
  REMINDER_ADDED:      'reminder_added',
  REMINDER_COMPLETED:  'reminder_completed',
  // Turnos
  SHIFT_ASSIGNED:      'shift_assigned',
  SHIFT_COMPLETED:     'shift_completed',
  // Miembros
  MEMBER_INVITED:      'member_invited',
  MEMBER_REMOVED:      'member_removed',
  MEMBER_ROLE_CHANGED: 'member_role_changed',
  // Organización
  ORG_UPDATED:         'org_updated',
};

// Tipos de entidad (categoría) — útil para filtrar el timeline por sección.
export const ENTITY = {
  CAT:      'cat',
  COLONY:   'colony',
  EVENT:    'event',
  REMINDER: 'reminder',
  SHIFT:    'shift',
  MEMBER:   'member',
  ORG:      'org',
};

/**
 * Registra una entrada de actividad. Fire-and-forget: no devuelve nada útil
 * y nunca lanza excepción al llamador.
 *
 * @param {object} params
 * @param {string} params.orgId       UUID de la organización (obligatorio).
 * @param {string} params.userId      UUID del usuario que ejecuta (= auth.uid()).
 * @param {string} params.userName    Nombre snapshot del usuario.
 * @param {string} params.action      Clave de ACTIONS.
 * @param {string} [params.entityType] Tipo de entidad (clave de ENTITY).
 * @param {string} [params.entityId]   UUID soft (sin constraint en BD).
 * @param {string} [params.entityName] Snapshot del nombre de la entidad.
 * @param {object} [params.metadata]   Detalles opcionales (jsonb).
 */
export const logActivity = ({
  orgId,
  userId,
  userName,
  action,
  entityType = null,
  entityId = null,
  entityName = null,
  metadata = {},
}) => {
  // Sin orgId o sin userId no podemos cumplir la RLS — simplemente no logueamos.
  if (!orgId || !userId || !action) return;

  // Promesa "huérfana" deliberadamente. No la await-eamos para no penalizar
  // la UX si la BD va lenta o la tabla está caída.
  supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    user_name: userName || '?',
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    metadata,
  }).then(({ error }) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[activity] log failed:', error.message);
    }
  });
};

// Mapper de fila de Postgres → forma camelCase consumible por la UI.
export const mapActivity = (row) => row && {
  id:         row.id,
  orgId:      row.org_id,
  userId:     row.user_id,
  userName:   row.user_name,
  action:     row.action,
  entityType: row.entity_type,
  entityId:   row.entity_id,
  entityName: row.entity_name,
  metadata:   row.metadata || {},
  createdAt:  row.created_at ? new Date(row.created_at).getTime() : 0,
};
