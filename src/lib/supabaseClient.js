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

// Captura del tipo de flujo de auth desde el hash de la URL ANTES de
// instanciar el cliente. Cuando alguien llega desde un email (invitación,
// recuperación), Supabase incluye `type=invite` o `type=recovery` en el
// hash. createClient con detectSessionInUrl=true lo procesa y limpia
// inmediatamente, así que si esperamos a useEffect ya se ha perdido. La
// store lee `initialAuthFlow` para decidir si mostrar la pantalla de
// "Define tu contraseña".
export let initialAuthFlow = null;
if (typeof window !== 'undefined' && window.location.hash) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const type = params.get('type');
  if (type === 'invite' || type === 'recovery') {
    initialAuthFlow = type;
  }
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
