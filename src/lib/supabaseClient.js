// Cliente Supabase compartido por toda la app. Se importa desde aquí en
// lugar de instanciarlo varias veces para que la sesión y los listeners de
// auth sean un único punto de verdad.
//
// Las credenciales se leen de las variables de entorno de Vite. En desarrollo
// vienen de `.env.local`; en producción (Cloudflare Pages) se configurarán
// como variables del proyecto en el dashboard de Pages.
//
// Si las variables faltan, lanzamos un error claro en lugar de dejar que
// Supabase explote más adelante con un mensaje críptico.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase. Asegúrate de tener un archivo ' +
    '`.env.local` (copia desde `.env.example`) con VITE_SUPABASE_URL y ' +
    'VITE_SUPABASE_ANON_KEY definidas, y reinicia `npm run dev`.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persistir la sesión en localStorage para sobrevivir a recargas de página.
    persistSession: true,
    // Detectar el token en la URL (necesario para los flujos de invitación
    // y recuperación de contraseña, que llegan con un hash en la URL).
    detectSessionInUrl: true,
    // Refrescar el access token automáticamente antes de que caduque.
    autoRefreshToken: true,
  },
});
