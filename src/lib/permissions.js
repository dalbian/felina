// Matriz de permisos por rol. Pura y sin dependencias para que sea trivial
// testearla y, en su momento, duplicarla server-side cuando haya backend.

const COORDINATOR_ACTIONS = [
  'edit_cat', 'delete_cat', 'add_cat',
  'edit_colony', 'delete_colony', 'add_colony',
  'add_event', 'change_status',
  'manage_shifts', 'assign_shift', 'claim_shift', 'complete_shift',
];

const VOLUNTEER_ACTIONS = [
  'edit_cat', 'add_cat',
  'add_colony',
  'add_event', 'change_status',
  'claim_shift', 'complete_shift',
];

const VET_ACTIONS = ['add_event'];

export const can = (role, action) => {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'coordinator') return COORDINATOR_ACTIONS.includes(action);
  if (role === 'volunteer') return VOLUNTEER_ACTIONS.includes(action);
  if (role === 'vet') return VET_ACTIONS.includes(action);
  return false;
};
