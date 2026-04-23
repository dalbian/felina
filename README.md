# Felina — Gestión de colonias felinas

Aplicación web para la gestión integral de colonias felinas por parte de organizaciones de protección animal. Prototipo React single-page pensado para validar la experiencia con protectoras reales antes de construir el backend definitivo.

## Estado actual: prototipo para validación

Esta versión guarda todos los datos en **`localStorage` del navegador**. Cada dispositivo tiene su propia base de datos local. Útil para:

- Enseñar la herramienta a protectoras y recoger feedback.
- Que una voluntaria la pruebe en su propio móvil.
- Hacer demos sin montar infraestructura.

**Limitaciones importantes que deben entender las usuarias antes de probar:**

- Los datos **no se sincronizan** entre dispositivos ni entre usuarias.
- Si vacías la caché del navegador, pierdes los datos.
- El login con usuarios de demostración no es autenticación real.
- No está pensado para uso productivo con datos personales reales de donantes, adoptantes o socios (RGPD).

Para uso productivo real hay que montar backend — ver sección "Siguientes pasos" al final.

## Stack

- **React 18** + **Vite**
- **Tailwind CSS** (solo utilidades core, sin plugins)
- **lucide-react** para iconos
- **Leaflet** + **OpenStreetMap** para mapas (se cargan por CDN, sin API key)
- Persistencia en `localStorage`

Sin backend. Sin base de datos. Sin servicios externos de pago.

## Requisitos

- **Node.js 18 o superior** ([descargar](https://nodejs.org/))
- npm (viene con Node)

## Desarrollo en local

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. El servidor hace hot reload al guardar cambios.

## Compilar para producción

```bash
npm run build
```

Genera la carpeta `dist/` con HTML, JS y CSS estáticos minificados. Eso es **todo** lo que hay que subir al servidor. No hace falta Node ni base de datos en el host.

Para probar el resultado en local antes de subirlo:

```bash
npm run preview
```

## Despliegue

Como `dist/` es HTML estático puro, vale cualquier hosting de estáticos. Listados por facilidad:

### Opción 1 — Netlify (más simple, gratis)

1. Regístrate en [netlify.com](https://www.netlify.com/).
2. Arrastra la carpeta `dist/` sobre su página de deploys. Te da una URL `https://algo.netlify.app`.
3. Para actualizar: arrastra la nueva carpeta `dist/`. Se publica en segundos.

Ventaja: puedes conectar tu repositorio de GitHub y que Netlify ejecute `npm run build` por ti cada vez que hagas push.

### Opción 2 — Cloudflare Pages (gratis, rápido en Europa)

1. Regístrate en [pages.cloudflare.com](https://pages.cloudflare.com/).
2. Conecta tu repositorio o sube un zip de `dist/`.
3. Configura el comando de build `npm run build` y el directorio de salida `dist`.

### Opción 3 — Vercel (gratis)

Similar a Netlify. [vercel.com](https://vercel.com/). También detecta Vite automáticamente.

### Opción 4 — GitHub Pages

Si ya tienes repo en GitHub, puedes servir `dist/` desde una rama `gh-pages`. Requiere un par de pasos adicionales; avísame si tiras por aquí y te pongo el workflow de GitHub Actions.

### Opción 5 — VPS propio (Hetzner ~5€/mes, OVH, etc.)

Sube el contenido de `dist/` a cualquier directorio que sirva Nginx o Apache. Ejemplo con Nginx:

```nginx
server {
  listen 80;
  server_name felina.tudominio.org;
  root /var/www/felina/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

La línea `try_files` es importante para que las URLs directas funcionen si más adelante añades rutas.

## Estructura del proyecto

```
felina-app/
├── index.html              # Punto de entrada HTML
├── package.json            # Dependencias y scripts
├── vite.config.js          # Configuración de Vite
├── tailwind.config.js      # Tailwind solo en src/
├── postcss.config.js       # Autoprefixer + Tailwind
├── public/
│   └── favicon.svg         # Icono de la app
└── src/
    ├── main.jsx            # Monta React en #root
    ├── index.css           # Directivas de Tailwind
    └── App.jsx             # Toda la aplicación (~4000 líneas, 1 archivo)
```

El código sigue siendo **single-file** a propósito. Cuando toque pasar a producción, se trocea, pero hasta entonces tener todo junto acelera las iteraciones.

## Usuarios de demostración

Al arrancar en un navegador limpio se crean dos organizaciones y varios usuarios demo. Para probar todos los roles:

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| Aina Roca | Superadmin global | Ver y gestionar todas las orgs |
| Marta Vidal | Admin de Gats del Barri | Gestión completa de la org |
| Jordi Puig | Coordinador | CRUD de colonias, gatos, turnos |
| Laia Martínez | Voluntaria | Añadir gatos/eventos, apuntarse a turnos |
| Dr. Pere Vila | Veterinario | Solo lectura + registrar eventos vet. |
| Anna Bosch | Admin de Felins del Maresme | Segunda org para probar multi-tenant |

## Reiniciar los datos de demo

Abre la consola del navegador y ejecuta:

```js
Object.keys(localStorage).filter(k => k.startsWith('felina:')).forEach(k => localStorage.removeItem(k));
location.reload();
```

Volverás a tener los datos de ejemplo recién generados.

## Siguientes pasos hacia producción

Cuando el feedback de las protectoras valide que la herramienta es útil, toca montar un backend real para poder usarlo en el día a día. Opciones, en orden de esfuerzo:

1. **Supabase + Next.js** (más rápido). Postgres gestionado + auth + storage de fotos. Pasas de prototipo a producción en un par de semanas manteniendo los componentes de React.
2. **Django + PostgreSQL** (más control). El admin de Django ahorra semanas en la parte de gestión interna. Frontend sigue siendo React (Next.js o SvelteKit).

Ambas tienen hosting barato (Railway, Fly.io, Hetzner VPS ~5€/mes).

## Licencia

Sin decidir aún. Si la herramienta te resulta útil y acaba publicándose como open source, la licencia probable será **MIT** o **GPL**.

---

Proyecto mantenido por una persona sola desde Cataluña. Pensado para ser regalado al tejido asociativo catalán y español. Feedback bienvenido.
