// Validaciones de credenciales. Prototipo: las contraseñas se guardan en
// localStorage en texto plano. Antes de pasar a producción hay que moverlas al
// backend con hashing (bcrypt/argon2).

export const PASSWORD_MIN = 8;

// En dev mostramos el panel con las credenciales demo para facilitar pruebas
// rápidas. En producción queda oculto; para forzarlo en un deploy concreto:
// VITE_SHOW_DEMO_CREDENTIALS=true.
export const SHOW_DEMO_CREDENTIALS =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';

export const normalizeEmail = (e) => (e || '').trim().toLowerCase();

export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const validatePassword = (pw, confirm) => {
  if (!pw || pw.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (confirm !== undefined && pw !== confirm) {
    return 'Las contraseñas no coinciden.';
  }
  return null;
};
