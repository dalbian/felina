// Identificador corto no criptográfico. Suficiente para claves de registro en
// prototipo; si se pasa a backend, el servidor emite IDs canónicos.
export const uid = () => Math.random().toString(36).slice(2, 10);
