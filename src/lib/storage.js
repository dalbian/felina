// Persistencia en localStorage con prefijo para no colisionar con otras apps
// del mismo dominio. Toda pieza temporal de la fase piloto (rgpdAck:*) usa el
// mismo prefijo para que "Reiniciar datos" las limpie también.

export const STORAGE_PREFIX = 'felina:';

export const load = async (key) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const r = window.localStorage.getItem(STORAGE_PREFIX + key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
};

export const save = async (key, val) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {
    /* cuota llena o modo incógnito restrictivo */
  }
};
