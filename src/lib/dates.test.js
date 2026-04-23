import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ymd,
  parseYmd,
  todayYmd,
  addDays,
  startOfWeek,
  startOfMonth,
  isSameYmd,
  fmtRelative,
} from './dates.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('ymd', () => {
  it('formatea Date a YYYY-MM-DD local con padding', () => {
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(ymd(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('acepta timestamp numérico', () => {
    const ts = new Date(2026, 4, 15).getTime();
    expect(ymd(ts)).toBe('2026-05-15');
  });
});

describe('parseYmd', () => {
  it('devuelve Date a medianoche local', () => {
    const d = parseYmd('2026-04-23');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3); // 0-indexed
    expect(d.getDate()).toBe(23);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('roundtrip con ymd', () => {
    expect(ymd(parseYmd('2026-07-08'))).toBe('2026-07-08');
  });
});

describe('todayYmd', () => {
  it('devuelve la fecha local de hoy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 14, 30));
    expect(todayYmd()).toBe('2026-06-10');
  });
});

describe('addDays', () => {
  it('suma días positivos y negativos sin mutar', () => {
    const base = new Date(2026, 0, 1);
    const next = addDays(base, 5);
    expect(ymd(next)).toBe('2026-01-06');
    expect(ymd(base)).toBe('2026-01-01'); // sin mutación
  });

  it('cruza correctamente cambios de mes', () => {
    expect(ymd(addDays(new Date(2026, 0, 30), 5))).toBe('2026-02-04');
    expect(ymd(addDays(new Date(2026, 1, 1), -1))).toBe('2026-01-31');
  });
});

describe('startOfWeek', () => {
  it('lunes es el primer día (devuelve el mismo lunes)', () => {
    // 2026-04-20 es lunes
    expect(ymd(startOfWeek(new Date(2026, 3, 20)))).toBe('2026-04-20');
  });

  it('miércoles → vuelve al lunes anterior', () => {
    // 2026-04-22 es miércoles
    expect(ymd(startOfWeek(new Date(2026, 3, 22)))).toBe('2026-04-20');
  });

  it('domingo → vuelve al lunes 6 días antes', () => {
    // 2026-04-26 es domingo
    expect(ymd(startOfWeek(new Date(2026, 3, 26)))).toBe('2026-04-20');
  });
});

describe('startOfMonth', () => {
  it('devuelve el día 1 a medianoche', () => {
    const d = startOfMonth(new Date(2026, 7, 14, 23, 59));
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(7);
    expect(d.getHours()).toBe(0);
  });
});

describe('isSameYmd', () => {
  it('compara solo la parte de fecha', () => {
    const a = new Date(2026, 3, 20, 9, 0);
    const b = new Date(2026, 3, 20, 23, 30);
    expect(isSameYmd(a, b)).toBe(true);
    expect(isSameYmd(a, addDays(a, 1))).toBe(false);
  });
});

describe('fmtRelative', () => {
  it('clasifica intervalos en hoy/ayer/hace…', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 5, 10, 12, 0).getTime();
    vi.setSystemTime(now);
    expect(fmtRelative(now)).toBe('hoy');
    expect(fmtRelative(now - 24 * 60 * 60 * 1000)).toBe('ayer');
    expect(fmtRelative(now - 5 * 24 * 60 * 60 * 1000)).toMatch(/hace 5 días/);
    expect(fmtRelative(now - 60 * 24 * 60 * 60 * 1000)).toMatch(/meses/);
    expect(fmtRelative(now - 400 * 24 * 60 * 60 * 1000)).toMatch(/años/);
  });
});
