# Felina — Gestión de colonias felinas

Aplicación web para que protectoras y asociaciones de protección animal gestionen
colonias de gatos: fichas de gatos, programa CER (Captura–Esterilización–Retorno),
historial veterinario, turnos de voluntariado y recordatorios médicos.

Pensada como herramienta gratuita para el tejido asociativo, mantenida por una
sola persona. Multi-organización: cada protectora ve y gestiona solo sus datos.

**En producción:** https://gestiofelina.org

---

## Estado del proyecto

Aplicación completa en producción con backend real (Supabase). Ya **no** es el
prototipo en `localStorage` de las primeras versiones — si lees referencias
antiguas a "datos solo en el navegador", están obsoletas.

Funcionalidad cubierta:

- Multi-organización con aislamiento de datos a nivel de base de datos (RLS).
- Autenticación real (email + contraseña, recuperación por email).
- Roles: superadministración global, y por organización admin / coordinador /
  voluntario / veterinario.
- Invitación de miembros por email autónoma (sin intervención del mantenedor).
- Colonias (con mapa), gatos (con foto y estado CER), eventos veterinarios.
- Calendario de turnos recurrentes de voluntariado.
- Recordatorios médicos por gato con avisos en el panel.
- Interfaz bilingüe **catalán / castellano** con selector en login y sidebar,
  preferencia persistida por dispositivo y detección automática del idioma del
  navegador en el primer acceso.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Iconos / mapas | lucide-react · Leaflet + OpenStreetMap (CDN) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions), región EU/Irlanda |
| Email transaccional | Resend (SMTP de Supabase Auth) |
| Hosting + CI/CD | Cloudflare Pages (auto-deploy desde `main`) |
| Dominio + DNS | Cloudflare Registrar — `gestiofelina.org` |

## Requisitos

- **Node.js 18 o superior** ([descargar](https://nodejs.org/))
- npm (viene con Node)
- Acceso al proyecto de Supabase y a la cuenta de Cloudflare (para desplegar)

## Arranque en local

```bash
git clone https://github.com/dalbian/felina.git
cd felina
npm install
```

Crea un archivo **`.env.local`** en la raíz (está en `.gitignore`, nunca se sube):

```
VITE_SUPABASE_URL=https://<ref-del-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

Los valores exactos están en el dashboard de Supabase → Project Settings → API.
Luego:

```bash
npm run dev      # servidor de desarrollo en http://localhost:5173
npm run build    # compila a dist/ (lo que despliega Cloudflare)
npm run test     # tests unitarios (vitest)
```

El `npm run dev` se conecta al **mismo** Supabase que producción. No hay base de
datos local: trabajas contra datos reales. Cuidado con lo que borras.

## Documentación

- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — cómo está montado todo por
  dentro: estructura del código, modelo de datos, seguridad (RLS), migraciones,
  despliegue, y cómo retomar el proyecto tras meses sin tocarlo.
- **[docs/GUIA-USUARIO.md](docs/GUIA-USUARIO.md)** — manual para las protectoras:
  roles, cómo gestionar colonias, gatos, turnos y recordatorios.
- **[docs/EMAILS-SUPABASE.md](docs/EMAILS-SUPABASE.md)** — textos en catalán de los
  emails de invitación y recuperación de contraseña, para configurar en el
  dashboard de Supabase.

## Estructura rápida

```
felina/
├── index.html
├── package.json
├── vite.config.js
├── .env.local            # credenciales (NO en git)
├── src/
│   ├── App.jsx           # orquestador: routing por vista, ramas de sesión
│   ├── constants.js      # diccionarios de dominio (estados, roles, tareas)
│   ├── hooks/
│   │   └── useFelinaStore.js   # TODO el estado y la lógica de negocio
│   ├── lib/              # helpers puros + cliente Supabase + i18n.jsx
│   └── components/       # vistas (dashboard, cats, calendar, …)
└── supabase/
    ├── migrations/       # esquema SQL versionado (0001…0007)
    └── functions/        # Edge Functions (invite-member)
```

## Licencia

Sin decidir formalmente. La intención es que sea software libre regalado al
tejido asociativo. Licencia probable: MIT o GPL.
