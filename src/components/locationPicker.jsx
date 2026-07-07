// Selector de ubicación sobre mini-mapa Leaflet. Se usa dentro del formulario
// de colonia (ColonyForm), que vive en un Modal. El usuario toca el mapa (o
// arrastra el marcador, o pulsa "usar mi ubicación") y el componente emite
// onPick({ lat, lng }) con 6 decimales.
//
// Props:
//   lat, lng : coordenadas actuales (number) o undefined si aún no hay.
//   onPick   : callback ({ lat, lng }) al elegir/mover el punto.
//
// Sincronización bidireccional: si lat/lng cambian por fuera (p. ej. el
// usuario los escribe en los campos manuales del form), el marcador se mueve
// solo. El guard de tolerancia (1e-6) evita bucles con nuestro propio onPick.

import { useEffect, useRef, useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { useLeaflet } from '../lib/useLeaflet.js';
import { useTranslation } from '../lib/i18n.jsx';
import { labelStyle } from '../styles.jsx';

// Vista por defecto cuando la colonia no tiene coordenadas: Cataluña amplia.
const DEFAULT_CENTER = [41.7, 1.9];
const DEFAULT_ZOOM = 8;
const PICKED_ZOOM = 15;

const round6 = (n) => parseFloat(Number(n).toFixed(6));

export function LocationPicker({ lat, lng, onPick }) {
  const { t } = useTranslation();
  const { ready, error } = useLeaflet();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick; // siempre la última sin re-suscribir handlers

  const [geoError, setGeoError] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  const hasCoords = (v) => typeof v === 'number' && !isNaN(v);
  const coordsValid = hasCoords(lat) && hasCoords(lng);

  const makeIcon = (L) => L.divIcon({
    className: 'felina-picker-marker',
    html: '<div class="felina-picker-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

  // Crea el marcador (arrastrable) si no existe, o lo mueve si ya está.
  const syncMarker = (latlng, { recenter = false } = {}) => {
    const L = window.L;
    const map = mapRef.current;
    if (!map || !L) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const marker = L.marker(latlng, { draggable: true, icon: makeIcon(L) }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        onPickRef.current?.({ lat: round6(p.lat), lng: round6(p.lng) });
      });
      markerRef.current = marker;
    }
    if (recenter) map.setView(latlng, Math.max(map.getZoom(), PICKED_ZOOM));
  };

  // Inicialización del mapa (una vez que Leaflet está listo).
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = window.L;
    const center = coordsValid ? [lat, lng] : DEFAULT_CENTER;
    const zoom = coordsValid ? PICKED_ZOOM : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { attributionControl: false, zoomControl: true })
      .setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© OpenStreetMap').addTo(map);
    mapRef.current = map;

    if (coordsValid) syncMarker([lat, lng]);

    map.on('click', (e) => {
      const picked = { lat: round6(e.latlng.lat), lng: round6(e.latlng.lng) };
      syncMarker([picked.lat, picked.lng]);
      onPickRef.current?.(picked);
    });

    // Fix del modal: al montar, el contenedor puede no tener tamaño medido
    // todavía → Leaflet pinta tiles grises. invalidateSize recalcula.
    const tid = setTimeout(() => map.invalidateSize(), 120);

    return () => {
      clearTimeout(tid);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Solo depende de `ready`: las coords iniciales se leen al montar y los
    // cambios posteriores los maneja el effect de sincronización de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Sincroniza el marcador cuando lat/lng cambian por fuera (campos manuales,
  // prefill). El guard de tolerancia evita reaccionar a nuestro propio onPick.
  useEffect(() => {
    if (!ready || !mapRef.current || !coordsValid) return;
    const current = markerRef.current?.getLatLng();
    if (!current || Math.abs(current.lat - lat) > 1e-6 || Math.abs(current.lng - lng) > 1e-6) {
      syncMarker([lat, lng], { recenter: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, ready]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoError(true); return; }
    setGeoBusy(true);
    setGeoError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        const picked = { lat: round6(pos.coords.latitude), lng: round6(pos.coords.longitude) };
        syncMarker([picked.lat, picked.lng], { recenter: true });
        onPickRef.current?.(picked);
      },
      () => { setGeoBusy(false); setGeoError(true); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (error) {
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
        {t('col.form.mapError')}
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .felina-picker-marker { background: none !important; border: none !important; }
        .felina-picker-pin {
          width: 18px; height: 18px; border-radius: 50% 50% 50% 0;
          background-color: #B15A3A; border: 2.5px solid #FDFAF3;
          transform: rotate(-45deg);
          box-shadow: 0 2px 6px rgba(42,37,32,0.4);
        }
        .felina-picker-map .leaflet-control-zoom a {
          background-color: #FDFAF3 !important; color: #4A433C !important;
          border-color: #EADFC9 !important;
        }
        .felina-picker-map .leaflet-control-attribution {
          background-color: rgba(253,250,243,0.9) !important; color: #78706A !important;
          font-size: 10px !important;
        }
      `}</style>

      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label className="text-xs font-medium inline-flex items-center gap-1.5" style={labelStyle}>
          <MapPin className="w-3 h-3" /> {t('col.form.mapLabel')}
        </label>
        <button type="button" onClick={useMyLocation} disabled={geoBusy}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg disabled:opacity-60"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
          <LocateFixed className="w-3.5 h-3.5" />
          {geoBusy ? t('col.form.locating') : t('col.form.useMyLocation')}
        </button>
      </div>

      {!ready ? (
        <div className="rounded-lg flex items-center justify-center h-52"
             style={{ backgroundColor: '#F2EADB' }}>
          <span className="text-xs italic" style={{ color: '#8A7A5C' }}>{t('col.form.mapLoading')}</span>
        </div>
      ) : (
        <div ref={containerRef}
             className="felina-picker-map rounded-lg overflow-hidden h-52"
             style={{ boxShadow: '0 0 0 1px #EADFC9', zIndex: 0 }} />
      )}

      <p className="text-[11px] mt-1.5" style={{ color: geoError ? '#B15A3A' : '#78706A' }}>
        {geoError ? t('col.form.geoError') : t('col.form.mapHint')}
      </p>
    </div>
  );
}
