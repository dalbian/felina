import { describe, it, expect } from 'vitest';
import { uid } from './ids.js';

describe('uid', () => {
  it('devuelve una cadena no vacía', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  it('tiene longitud razonable y estable', () => {
    for (let i = 0; i < 50; i++) {
      const id = uid();
      expect(id.length).toBeLessThanOrEqual(8);
      expect(id.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('produce valores distintos de forma razonablemente única', () => {
    const set = new Set();
    for (let i = 0; i < 1000; i++) set.add(uid());
    // Con ~8 chars base36 la colisión es muy improbable en 1000 llamadas.
    expect(set.size).toBeGreaterThan(995);
  });

  it('solo contiene caracteres base36', () => {
    expect(uid()).toMatch(/^[0-9a-z]+$/);
  });
});
