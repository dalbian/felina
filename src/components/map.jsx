// Vista de mapa con Leaflet cargado por CDN (sin peso en el bundle de prod).
// Soporta modo "añadir colonia tocando el mapa" para que el usuario piloto
// no tenga que conocer latitud/longitud.

import { useState, useEffect, useRef } from 'react';
import { MapPin, Map, AlertTriangle, ChevronRight, X } from 'lucide-react';
import { EmptyState } from './ui.jsx';

export const MapView = ({ colonies, cats, orgName, onSelectColony, canAddColony, onPickLocation }) => {
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [addMode, setAddMode] = useState(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Carga perezosa de Leaflet (CSS + JS) desde CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.L) { setMapReady(true); return; }

    if (!document.querySelector('link[data-felina-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      css.setAttribute('data-felina-leaflet', 'true');
      document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-felina-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => setMapReady(true));
      existing.addEventListener('error', () => setError('No se pudo cargar el mapa.'));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.setAttribute('data-felina-leaflet', 'true');
    script.async = true;
    script.onload = () => setMapReady(true);
    script.onerror = () => setError('No se pudo cargar Leaflet desde la CDN. Revisa tu conexión.');
    document.body.appendChild(script);
  }, []);

  // Inicializar mapa una vez Leaflet esté listo y el div exista
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      attributionControl: false,
      zoomControl: true,
    }).setView([41.39, 2.17], 11);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© OpenStreetMap')
      .addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = [];
      }
    };
  }, [mapReady]);

  // Sincronizar marcadores cuando cambian las colonias/gatos
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const withCoords = colonies.filter(c => c.lat && c.lng);
    if (withCoords.length === 0) return;

    withCoords.forEach(col => {
      const colCats = cats.filter(c => c.colonyId === col.id);
      const sterilized = colCats.filter(c => ['esterilizado','en_colonia','en_acogida','adoptado'].includes(c.cerStatus)).length;
      const pct = colCats.length > 0 ? Math.round((sterilized/colCats.length)*100) : 0;
      const color = colCats.length === 0 ? '#8A7A5C' : pct >= 80 ? '#4A6332' : pct >= 50 ? '#8A6B1F' : '#B15A3A';

      const icon = L.divIcon({
        className: 'felina-marker',
        html: `
          <div class="felina-marker-pin" style="background-color: ${color};">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FDFAF3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="gato">
              <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.26 6.5 2.26C10.65 5.09 11.33 5 12 5z"/>
              <path d="M8 14v.5"/>
              <path d="M16 14v.5"/>
              <path d="M11.25 16.25h1.5L12 17l-.75-.75z"/>
            </svg>
          </div>
          <div class="felina-marker-tail" style="border-top-color: ${color};"></div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -48],
      });

      const marker = L.marker([col.lat, col.lng], { icon }).addTo(map);
      marker.bindTooltip(col.name, { direction: 'top', offset: [0, -46], className: 'felina-tooltip' });

      const popupHtml = `
        <div class="felina-popup">
          <div class="felina-popup-title">${col.name}</div>
          <div class="felina-popup-address">${col.address || 'Sin dirección'}</div>
          <div class="felina-popup-stats">
            <span><strong>${colCats.length}</strong> gato${colCats.length !== 1 ? 's' : ''}</span>
            <span><strong>${pct}%</strong> CER</span>
          </div>
          <button class="felina-popup-btn" data-colony-id="${col.id}">Ver ficha de la colonia</button>
        </div>
      `;
      marker.bindPopup(popupHtml, { closeButton: false, offset: [0, 0] });
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.querySelector(`.felina-popup-btn[data-colony-id="${col.id}"]`);
          if (btn) btn.onclick = () => onSelectColony(col.id);
        }, 10);
      });

      markersRef.current.push(marker);
    });

    if (withCoords.length === 1) {
      map.setView([withCoords[0].lat, withCoords[0].lng], 15);
    } else {
      const bounds = L.latLngBounds(withCoords.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [colonies, cats, mapReady, onSelectColony]);

  // Modo "añadir colonia": engancha un handler de click sobre el mapa.
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const map = mapInstanceRef.current;
    if (!addMode) return;

    const handler = (e) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6));
      const lng = parseFloat(e.latlng.lng.toFixed(6));
      setAddMode(false);
      if (typeof onPickLocation === 'function') onPickLocation({ lat, lng });
    };
    map.on('click', handler);
    if (mapContainerRef.current) mapContainerRef.current.classList.add('felina-map-picking');
    return () => {
      map.off('click', handler);
      if (mapContainerRef.current) mapContainerRef.current.classList.remove('felina-map-picking');
    };
  }, [addMode, mapReady, onPickLocation]);

  const withCoords = colonies.filter(c => c.lat && c.lng);
  const withoutCoords = colonies.filter(c => !c.lat || !c.lng);

  return (
    <div className="space-y-6">
      <style>{`
        .felina-marker { background: none !important; border: none !important; }
        .felina-marker-pin {
          width: 40px; height: 40px; border-radius: 50%; color: #FDFAF3;
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 14px;
          border: 2.5px solid #FDFAF3;
          box-shadow: 0 3px 10px rgba(42,37,32,0.35);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .felina-marker-tail {
          width: 0; height: 0; margin: -2px auto 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top-width: 10px; border-top-style: solid;
          filter: drop-shadow(0 2px 2px rgba(42,37,32,0.2));
        }
        .felina-tooltip {
          background: #1A1712 !important; color: #F8F3E8 !important;
          border: none !important; border-radius: 6px !important;
          font-family: 'DM Sans', system-ui, sans-serif !important;
          font-size: 12px !important; padding: 4px 8px !important;
          box-shadow: 0 2px 6px rgba(42,37,32,0.25) !important;
        }
        .felina-tooltip::before { border-top-color: #1A1712 !important; }
        .leaflet-popup-content-wrapper {
          background: #FDFAF3 !important; border-radius: 16px !important;
          box-shadow: 0 8px 24px rgba(42,37,32,0.18), 0 0 0 1px #EADFC9 !important;
          padding: 4px !important;
        }
        .leaflet-popup-tip { background: #FDFAF3 !important; box-shadow: 0 0 0 1px #EADFC9 !important; }
        .leaflet-popup-content { margin: 12px !important; font-family: 'DM Sans', system-ui, sans-serif !important; min-width: 220px; }
        .felina-popup-title { font-family: 'Fraunces', Georgia, serif; font-size: 18px; color: #1A1712; margin-bottom: 4px; line-height: 1.2; }
        .felina-popup-address { font-size: 12px; color: #78706A; margin-bottom: 10px; }
        .felina-popup-stats { display: flex; gap: 14px; font-size: 13px; color: #4A433C; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #F0E8D6; }
        .felina-popup-stats strong { color: #1A1712; font-weight: 600; }
        .felina-popup-btn {
          display: block; width: 100%; padding: 8px 12px; border-radius: 10px;
          background-color: #1F3A2F; color: #F8F3E8;
          border: none; cursor: pointer; font-size: 13px; font-weight: 500;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .felina-popup-btn:hover { background-color: #2D4A3E; }
        .leaflet-control-zoom a {
          background-color: #FDFAF3 !important; color: #4A433C !important;
          border-color: #EADFC9 !important;
        }
        .leaflet-control-attribution {
          background-color: rgba(253,250,243,0.9) !important; color: #78706A !important;
          font-family: 'DM Sans', system-ui, sans-serif !important; font-size: 10px !important;
        }
        .leaflet-control-attribution a { color: #4A433C !important; }
        .felina-map-picking, .felina-map-picking .leaflet-grab { cursor: crosshair !important; }
        .felina-map-picking .leaflet-interactive { cursor: crosshair !important; }
      `}</style>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>Visualización</div>
          <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1712' }}>
            Mapa de <span className="italic" style={{ color: '#C67B5C' }}>colonias</span>
          </h1>
          <p className="mt-3 text-[15px]" style={{ color: '#6B635A' }}>
            {withCoords.length > 0
              ? `Mostrando ${withCoords.length} colonia${withCoords.length !== 1 ? 's' : ''} de ${orgName}.`
              : `${orgName} aún no tiene colonias con coordenadas registradas.`}
          </p>
        </div>
        {canAddColony && mapReady && !error && (
          <button onClick={() => setAddMode(v => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: addMode ? '#F5DDCE' : '#1F3A2F',
                    color: addMode ? '#8A3A1F' : '#F8F3E8',
                  }}>
            {addMode ? (<><X className="w-4 h-4" /> Cancelar</>) : (<><MapPin className="w-4 h-4" /> Añadir colonia tocando el mapa</>)}
          </button>
        )}
      </div>

      {addMode && (
        <div className="rounded-xl px-4 py-2.5 text-sm flex items-center gap-2"
             style={{ backgroundColor: '#FDF4DE', color: '#8A6B1F', boxShadow: '0 0 0 1px #E8D4A0' }}>
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>Toca el mapa donde está la nueva colonia. Después podrás ajustar el nombre, dirección y notas.</span>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#F5DDCE' }}>
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" style={{ color: '#B15A3A' }} />
          <p className="text-sm" style={{ color: '#4A433C' }}>{error}</p>
        </div>
      ) : !mapReady ? (
        <div className="rounded-2xl flex items-center justify-center h-[45vh] min-h-[320px] md:h-[60vh] md:min-h-[400px]"
             style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F2EADB' }}>
              <Map className="w-5 h-5" style={{ color: '#8A7A5C' }} />
            </div>
            <div className="font-serif italic text-sm" style={{ color: '#8A7A5C' }}>Cargando mapa…</div>
          </div>
        </div>
      ) : withCoords.length === 0 && withoutCoords.length === 0 ? (
        <EmptyState icon={Map} title="Aún no hay colonias"
                    description="Añade tu primera colonia desde la sección de Colonias para verla en el mapa." />
      ) : (
        <>
          <div ref={mapContainerRef}
               className="rounded-2xl overflow-hidden h-[45vh] min-h-[320px] md:h-[60vh] md:min-h-[400px]"
               style={{ boxShadow: '0 0 0 1px #EADFC9', zIndex: 0 }} />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8A7A5C' }}>Leyenda</div>
              <div className="space-y-2 text-xs" style={{ color: '#4A433C' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: '#4A6332', borderColor: '#FDFAF3' }} />
                  <span>Más del 80% esterilizadas</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: '#8A6B1F', borderColor: '#FDFAF3' }} />
                  <span>Entre el 50% y el 80%</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: '#B15A3A', borderColor: '#FDFAF3' }} />
                  <span>Menos del 50% (prioridad)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex-shrink-0 border-2" style={{ backgroundColor: '#8A7A5C', borderColor: '#FDFAF3' }} />
                  <span>Sin gatos fichados</span>
                </div>
                <div className="pt-2 mt-2 border-t text-[11px]" style={{ borderColor: '#F0E8D6', color: '#78706A' }}>
                  Pasa el ratón sobre un marcador para ver el nombre, o haz clic para abrir la ficha de la colonia.
                </div>
              </div>
            </div>

            {withoutCoords.length > 0 && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDF4DE', boxShadow: '0 0 0 1px #E8D4A0' }}>
                <div className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#8A6B1F' }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Sin coordenadas ({withoutCoords.length})
                </div>
                <p className="text-xs mb-3" style={{ color: '#78706A' }}>
                  Estas colonias no aparecen en el mapa. Edita su ficha para añadir latitud y longitud.
                </p>
                <div className="space-y-1.5">
                  {withoutCoords.map(col => (
                    <button key={col.id} onClick={() => onSelectColony(col.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#FDFAF3]"
                            style={{ backgroundColor: 'rgba(253,250,243,0.6)' }}>
                      <span style={{ color: '#1A1712' }}>{col.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: '#B8A888' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
