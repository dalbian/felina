// Hook de carga de Leaflet (CSS + JS) desde CDN. Reutilizable por cualquier
// componente que necesite un mapa. Carga la librería UNA sola vez para toda
// la app (marca los tags con data-felina-leaflet) y expone { ready, error }.
//
// window.L queda disponible globalmente cuando `ready` es true. Leaflet no
// va en el bundle: se descarga on-demand desde cdnjs, igual que hace MapView.
//
// Nota: MapView tiene su propia copia de esta lógica por razones históricas.
// Los nuevos consumidores (p. ej. el selector de ubicación del formulario de
// colonia) usan este hook. Ambos comparten los mismos tags del DOM, así que
// no se descarga Leaflet dos veces aunque coexistan.

import { useState, useEffect } from 'react';

const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';

export function useLeaflet() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.L);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { setReady(true); return; }

    // CSS (idempotente).
    if (!document.querySelector('link[data-felina-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      css.setAttribute('data-felina-leaflet', 'true');
      document.head.appendChild(css);
    }

    // JS: si ya hay un tag (lo insertó MapView u otra instancia), nos
    // enganchamos a su load/error en lugar de duplicarlo.
    const existing = document.querySelector('script[data-felina-leaflet]');
    if (existing) {
      if (window.L) { setReady(true); return; }
      const onLoad = () => setReady(true);
      const onError = () => setError('load-failed');
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onError);
      return () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onError);
      };
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.setAttribute('data-felina-leaflet', 'true');
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError('load-failed');
    document.body.appendChild(script);
  }, []);

  return { ready, error };
}
