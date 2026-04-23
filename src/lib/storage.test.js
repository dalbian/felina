import { describe, it, expect, beforeEach, vi } from 'vitest';
import { load, save, STORAGE_PREFIX } from './storage.js';

// localStorage mínimo en memoria para tests node
const mockStorage = () => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _raw: store,
  };
};

describe('storage', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: mockStorage() });
  });

  it('save + load redondea un objeto', async () => {
    await save('foo', { a: 1, b: [2, 3], c: 'x' });
    const loaded = await load('foo');
    expect(loaded).toEqual({ a: 1, b: [2, 3], c: 'x' });
  });

  it('load devuelve null si la clave no existe', async () => {
    expect(await load('no-existe')).toBeNull();
  });

  it('load devuelve null si el JSON está corrupto', async () => {
    window.localStorage.setItem(STORAGE_PREFIX + 'roto', '{no es json');
    expect(await load('roto')).toBeNull();
  });

  it('usa el prefijo felina:', async () => {
    await save('clave', 42);
    expect(window.localStorage.getItem(STORAGE_PREFIX + 'clave')).toBe('42');
    expect(window.localStorage.getItem('clave')).toBeNull();
  });

  it('save tolera ausencia de window sin lanzar', async () => {
    vi.stubGlobal('window', undefined);
    await expect(save('k', 1)).resolves.toBeUndefined();
    await expect(load('k')).resolves.toBeNull();
  });
});
