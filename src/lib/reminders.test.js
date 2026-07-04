import { describe, it, expect } from 'vitest';
import { catReminderStatus, SOON_WINDOW_DAYS } from './reminders.js';

const TODAY = '2026-07-10';

// Helper para construir recordatorios de prueba.
const rem = (catId, dueDate, completedAt = null) => ({ catId, dueDate, completedAt });

describe('catReminderStatus', () => {
  it('devuelve null si el gato no tiene recordatorios', () => {
    expect(catReminderStatus('cat1', [], TODAY)).toBeNull();
    expect(catReminderStatus('cat1', [rem('otro', '2026-07-01')], TODAY)).toBeNull();
  });

  it('marca overdue si hay un pendiente con fecha pasada', () => {
    expect(catReminderStatus('cat1', [rem('cat1', '2026-07-09')], TODAY)).toBe('overdue');
    expect(catReminderStatus('cat1', [rem('cat1', '2026-01-01')], TODAY)).toBe('overdue');
  });

  it('marca soon si vence hoy', () => {
    expect(catReminderStatus('cat1', [rem('cat1', TODAY)], TODAY)).toBe('soon');
  });

  it('marca soon si vence dentro de la ventana (7 días)', () => {
    expect(catReminderStatus('cat1', [rem('cat1', '2026-07-17')], TODAY)).toBe('soon'); // +7
    expect(catReminderStatus('cat1', [rem('cat1', '2026-07-13')], TODAY)).toBe('soon'); // +3
  });

  it('devuelve null si vence más allá de la ventana', () => {
    expect(catReminderStatus('cat1', [rem('cat1', '2026-07-18')], TODAY)).toBeNull(); // +8
    expect(catReminderStatus('cat1', [rem('cat1', '2026-12-01')], TODAY)).toBeNull();
  });

  it('overdue tiene prioridad sobre soon', () => {
    const reminders = [rem('cat1', '2026-07-01'), rem('cat1', '2026-07-12')];
    expect(catReminderStatus('cat1', reminders, TODAY)).toBe('overdue');
  });

  it('ignora los recordatorios completados', () => {
    expect(catReminderStatus('cat1', [rem('cat1', '2026-07-01', 123456)], TODAY)).toBeNull();
    // Uno completado (vencido) + uno pendiente próximo → soon
    const reminders = [rem('cat1', '2026-07-01', 123456), rem('cat1', '2026-07-12')];
    expect(catReminderStatus('cat1', reminders, TODAY)).toBe('soon');
  });

  it('ignora recordatorios sin fecha', () => {
    expect(catReminderStatus('cat1', [rem('cat1', null)], TODAY)).toBeNull();
  });

  it('la ventana es de 7 días', () => {
    expect(SOON_WINDOW_DAYS).toBe(7);
  });
});
