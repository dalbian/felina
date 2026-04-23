import { describe, it, expect } from 'vitest';
import { can } from './permissions.js';

describe('can(role, action)', () => {
  it('sin rol no puede nada', () => {
    expect(can(null, 'add_cat')).toBe(false);
    expect(can(undefined, 'anything')).toBe(false);
    expect(can('', 'add_cat')).toBe(false);
  });

  it('admin puede cualquier acción (incluso inventadas, es su rol)', () => {
    expect(can('admin', 'add_cat')).toBe(true);
    expect(can('admin', 'delete_cat')).toBe(true);
    expect(can('admin', 'manage_shifts')).toBe(true);
    expect(can('admin', 'nueva_accion_futura')).toBe(true);
  });

  it('coordinator gestiona colonias/gatos/turnos pero no administra equipo', () => {
    expect(can('coordinator', 'add_cat')).toBe(true);
    expect(can('coordinator', 'delete_cat')).toBe(true);
    expect(can('coordinator', 'delete_colony')).toBe(true);
    expect(can('coordinator', 'manage_shifts')).toBe(true);
    expect(can('coordinator', 'assign_shift')).toBe(true);
    // Acción desconocida → false (no es admin)
    expect(can('coordinator', 'manage_members')).toBe(false);
  });

  it('volunteer añade cosas pero no borra', () => {
    expect(can('volunteer', 'add_cat')).toBe(true);
    expect(can('volunteer', 'edit_cat')).toBe(true);
    expect(can('volunteer', 'add_event')).toBe(true);
    expect(can('volunteer', 'claim_shift')).toBe(true);
    expect(can('volunteer', 'delete_cat')).toBe(false);
    expect(can('volunteer', 'delete_colony')).toBe(false);
    expect(can('volunteer', 'manage_shifts')).toBe(false);
    expect(can('volunteer', 'assign_shift')).toBe(false);
  });

  it('vet solo registra eventos veterinarios', () => {
    expect(can('vet', 'add_event')).toBe(true);
    expect(can('vet', 'add_cat')).toBe(false);
    expect(can('vet', 'edit_cat')).toBe(false);
    expect(can('vet', 'claim_shift')).toBe(false);
  });

  it('rol inventado no puede nada', () => {
    expect(can('superhero', 'add_cat')).toBe(false);
  });
});
