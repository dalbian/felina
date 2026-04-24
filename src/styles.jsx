// Estilos compartidos. En React los objetos style son baratos de compartir y
// así los formularios mantienen consistencia visual sin repetir código.

import React from 'react';

export const inputStyle = {
  backgroundColor: '#FFFFFF',
  boxShadow: '0 0 0 1px #EADFC9',
  color: '#1A1712',
};

export const labelStyle = { color: '#4A433C' };

// Hoja de estilos global: tipografías de Google Fonts + ajustes base (focus,
// chevron del select). Se renderiza como <style> dentro del árbol de React en
// cada rama del App (login, bloqueo, app logueada) — más simple que montar un
// link global en index.html porque aquí queda co-ubicado con el componente.
export const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    * { font-family: 'DM Sans', system-ui, sans-serif; }
    .font-serif { font-family: 'Fraunces', Georgia, serif; font-variation-settings: "opsz" 144; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
    /* overflow-x: hidden evita que cualquier elemento que accidentalmente se
       salga de ancho genere scroll horizontal en toda la app. Red de seguridad
       para móviles pequeños. */
    html, body { background-color: #F8F3E8; overflow-x: hidden; }
    input:focus, select:focus, textarea:focus { box-shadow: 0 0 0 2px #2D4A3E !important; }
    select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5l3 3 3-3' stroke='%238A7A5C' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
  `}</style>
);
