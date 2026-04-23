import { describe, it, expect } from 'vitest';
import {
  PASSWORD_MIN,
  normalizeEmail,
  isValidEmail,
  validatePassword,
} from './auth.js';

describe('normalizeEmail', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    expect(normalizeEmail('  Foo@Bar.COM  ')).toBe('foo@bar.com');
  });

  it('trata null/undefined como cadena vacía', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail('')).toBe('');
  });
});

describe('isValidEmail', () => {
  it('acepta emails bien formados', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('marta@gatsdelbarri.org')).toBe(true);
    expect(isValidEmail('ana.bosch+test@domini.cat')).toBe(true);
  });

  it('rechaza cadenas sin @ o sin dominio', () => {
    expect(isValidEmail('sin-arroba')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('@b.co')).toBe(false);
    expect(isValidEmail('a@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('a b@c.co')).toBe(false); // espacio en medio
  });
});

describe('validatePassword', () => {
  it(`rechaza contraseñas con menos de ${PASSWORD_MIN} caracteres`, () => {
    expect(validatePassword('short')).toMatch(/al menos/);
    expect(validatePassword('')).toMatch(/al menos/);
    expect(validatePassword(undefined)).toMatch(/al menos/);
  });

  it('acepta longitud mínima exacta si no hay confirmación', () => {
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('larguisima'.padEnd(30, 'x'))).toBeNull();
  });

  it('exige que confirmación coincida cuando se pasa', () => {
    expect(validatePassword('abcdefgh', 'abcdefgh')).toBeNull();
    expect(validatePassword('abcdefgh', 'abcdefgX')).toMatch(/no coinciden/);
  });

  it('no valida confirmación si el primer argumento falla', () => {
    expect(validatePassword('short', 'short')).toMatch(/al menos/);
  });
});
