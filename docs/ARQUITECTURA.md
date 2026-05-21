# Arquitectura técnica — Felina

Documento para quien mantenga el código: tú dentro de seis meses, o alguien a
quien le pases el proyecto. Explica cómo está montado todo y, sobre todo, **cómo
retomarlo sin reaprenderlo desde cero**.

## Índice

1. [Visión general](#1-visión-general)
2. [Patrón de arquitectura del frontend](#2-patrón-de-arquitectura-del-frontend)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Seguridad: Row Level Security](#4-seguridad-row-level-security)
5. [Autenticación e invitaciones](#5-autenticación-e-invitaciones)
6. [Migraciones de base de datos](#6-migraciones-de-base-de-datos)
7. [Edge Functions](#7-edge-functions)
8. [Despliegue](#8-despliegue)
9. [Servicios externos y costes](#9-servicios-externos-y-costes)
10. [Cómo retomar el proyecto](#10-cómo-retomar-el-proyecto)
11. [Decisiones de diseño y gotchas](#11-decisiones-de-diseño-y-gotchas)
12. [Internacionalización (ca/es)](#12-internacionalización-caes)

---

## 1. Visión general

Felina es una SPA de React servida como estático desde Cloudflare Pages, que
habla directamente con Supabase (Postgres + Auth + Storage) desde el navegador.
No hay servidor backend propio: la seguridad la garantizan las políticas **Row
Level Security (RLS)** de Postgres, no el código del cliente (que es manipulable).

```
Navegador (React)  ──►  Supabase
                         ├── Auth        (sesiones JWT)
                         ├── Postgres    (datos + RLS)
                         ├── Storage     (fotos de gatos)
                         └── Edge Fn     (invite-member, service_role)
```

La única lógica que corre fuera del cliente es la Edge Function `invite-member`,
porque necesita la `service_role` key (permisos admin) que jamás puede salir al
navegador.

## 2. Patrón de arquitectura del frontend

Regla de oro: **toda la lógica de negocio y el acceso a datos vive en
`src/hooks/useFelinaStore.js`**. Es el único punto que habla con Supabase. Los
componentes son "tontos": reciben datos y handlers por props y pintan.

```
src/
├── App.jsx                  Orquestador. Decide qué vista renderizar según
│                            `view` y la rama de sesión (login / sin org /
│                            org suspendida / set-password / app normal).
│                            Cablea todos los modales globales.
├── constants.js             Diccionarios de dominio con su presentación VISUAL
│                            (color/bg/icono): CER_STATUS, EVENT_TYPES,
│                            SHIFT_TASKS, SHIFT_SLOTS, ROLES, DAYS_OF_WEEK,
│                            SEX_VALUES. El texto va por i18n, no aquí.
├── hooks/
│   └── useFelinaStore.js    EL núcleo. Estado (datos + UI), carga inicial,
│                            listener de auth, y TODOS los handlers
│                            (login, CRUD, permisos, plataforma…).
├── lib/                     Helpers puros y aislados, fáciles de testear:
│   ├── supabaseClient.js    Cliente Supabase único + initialAuthFlow.
│   ├── auth.js              Validación de credenciales, flags.
│   ├── permissions.js       Matriz de permisos por rol (espejo de las RLS).
│   ├── dates.js             Formateo y aritmética de fechas (locale dinámico).
│   ├── shifts.js            Materialización de turnos virtuales.
│   ├── images.js            Resize + upload de fotos a Storage.
│   ├── i18n.jsx             Sistema bilingüe ca/es (ver sección 12).
│   ├── ids.js, storage.js   uid(), wrapper de localStorage (solo UI state).
│   └── *.test.js            Tests con vitest.
└── components/              Vistas. Consumen el store vía props desde App.jsx.
    ├── dashboard.jsx        Panel: KPIs, turnos, recordatorios.
    ├── colonies.jsx         Lista y detalle de colonias + formulario.
    ├── cats.jsx             Lista, detalle y formularios de gatos, eventos,
    │                        recordatorios.
    ├── map.jsx              Mapa Leaflet de colonias.
    ├── calendar.jsx         Calendario de turnos (mes/semana/mis turnos/
    │                        plantillas) + formularios.
    ├── platform.jsx         Vista superadmin (gestión de todas las orgs).
    ├── settings.jsx         Ajustes de org, miembros, sesión.
    ├── auth.jsx             Login, recuperación, set-password, banner, RGPD.
    ├── layout.jsx           Sidebar y navegación inferior móvil.
    ├── modals.jsx           Todos los modales globales en un sitio.
    └── ui.jsx               Componentes reutilizables (Modal, avatares…).
```

### Por qué este patrón

Cuando se migró de prototipo (localStorage) a backend real, **solo cambió
`useFelinaStore.js` y `lib/supabaseClient.js`**. Los componentes ni se tocaron
porque seguían recibiendo los mismos datos con la misma forma. Si algún día se
cambia de backend otra vez, el punto de cambio sigue siendo ese.

### Mappers snake_case ↔ camelCase

Postgres usa `snake_case` (`org_id`, `photo_url`, `created_at`). El código del
frontend usa `camelCase` (`orgId`, `photoUrl`, `createdAt`). La conversión está
centralizada en mappers al principio de `useFelinaStore.js` (`mapProfile`,
`mapOrg`, `mapColony`, `mapCat`, `mapEvent`, `mapShiftTemplate`, `mapShift`,
`mapCatReminder`). Las fechas timestamptz se convierten de ISO a ms con `toMs()`
para que los helpers de `dates.js` funcionen sin cambios.

### Patrón de los handlers

Cada mutación sigue el mismo esquema: comprobar permiso con `can()` → llamada
a Supabase (`insert`/`update`/`delete`) → si error, `notify()` con mensaje
legible → `refresh()` para recargar datos visibles → cerrar modal. `refresh()`
re-ejecuta `loadAuthenticatedData`, que trae todo lo que el usuario puede ver
(RLS filtra automáticamente).

## 3. Modelo de datos

Todas las tablas viven en el esquema `public`. PK siempre `uuid` con
`gen_random_uuid()`.

| Tabla | Qué guarda | Claves |
|---|---|---|
| `organizations` | Las protectoras | `suspended` bloquea acceso de no-superadmin |
| `profiles` | 1-a-1 con `auth.users` | `name`, `email`, `color`, `super_admin` |
| `memberships` | Quién pertenece a qué org y con qué rol | `unique(user_id, org_id)` |
| `colonies` | Colonias, scoped por `org_id` | `lat`/`lng` opcional para el mapa |
| `cats` | Fichas de gato | `colony_id` nullable, `photo_url` |
| `events` | Historial veterinario (lo que YA pasó) | `org_id` denormalizado |
| `cat_reminders` | Pendientes médicos (lo que TOCA) | `completed_at`/`completed_by` |
| `shift_templates` | Plantillas de turno recurrentes | `days_of_week smallint[]` |
| `shifts` | Instancias de turno materializadas | `assignee_id`, `status` |

### Enums

| Enum | Valores |
|---|---|
| `org_role` | `admin`, `coordinator`, `volunteer`, `vet` |
| `cer_status` | `pendiente`, `capturado`, `esterilizado`, `en_colonia`, `en_acogida`, `adoptado`, `fallecido` |
| `cat_sex` | `H`, `M`, `D` (Hembra / Macho / Desconocido) |
| `event_type` | `esterilizacion`, `vacunacion`, `desparasitacion`, `consulta`, `tratamiento` |
| `shift_slot` | `morning`, `afternoon` |
| `shift_task` | `alimentacion`, `agua_limpieza`, `observacion`, `medicacion`, `otros` |
| `shift_status` | `open`, `assigned`, `done` |

### Notas de diseño del modelo

- **`org_id` denormalizado** en `events` y `cat_reminders` (además del `cat_id`):
  evita un JOIN en las RLS. Es seguro porque los gatos no cambian de org.
- **`events` vs `cat_reminders`**: conceptos separados a propósito. `events` =
  historial inmutable de lo ocurrido. `cat_reminders` = lo pendiente. Marcar un
  recordatorio como hecho NO crea un evento automáticamente (se hace a mano).
- **Turnos virtuales vs materializados**: `shift_templates` genera turnos
  "virtuales" calculados al vuelo por `lib/shifts.js → computeShifts()`. Solo se
  crea una fila en `shifts` cuando alguien interactúa (se apunta, lo asignan, lo
  completa). Al desapuntarse de un turno "limpio" la fila se borra y vuelve a
  virtual.

## 4. Seguridad: Row Level Security

**La seguridad real está en Postgres, no en el frontend.** El cliente usa la
*publishable key* (pública por diseño); lo que protege los datos son las
políticas RLS. La matriz de `src/lib/permissions.js` es solo UX (ocultar botones)
— el backend la duplica como RLS y es la que manda.

### Funciones helper (todas `security definer`)

Definidas en la migración `0001`. `security definer` para evitar recursión
infinita al consultar `memberships`/`profiles` desde dentro de una policy:

- `is_super_admin()` → ¿el usuario actual tiene `profiles.super_admin = true`?
- `is_org_member(org_id)` → ¿tiene membership en esa org?
- `user_org_role(org_id)` → su rol en esa org (o null).
- `is_org_admin(org_id)` → ¿su rol ahí es `admin`?

### Patrón de las políticas

Para casi toda tabla scoped por org:

- **SELECT**: `is_super_admin() OR is_org_member(org_id)`
- **INSERT/UPDATE/DELETE**: según rol vía `user_org_role(org_id) IN (...)`,
  espejando `permissions.js`. Ejemplo: borrar gatos solo `admin`/`coordinator`;
  voluntario puede crear/editar pero no borrar.

`storage.objects` (bucket `cat-photos`) tiene sus propias políticas: lectura
pública (paths uuid no enumerables), escritura solo para miembros de la org cuyo
uuid es el primer segmento del path (`{org_id}/{cat_id}.jpg`).

### Matriz de permisos resumida

| Acción | admin | coordinator | volunteer | vet |
|---|:-:|:-:|:-:|:-:|
| Ver datos de la org | ✓ | ✓ | ✓ | ✓ |
| Crear/editar colonias | ✓ | ✓ | ✓ (crear) | — |
| Borrar colonias | ✓ | ✓ | — | — |
| Crear/editar gatos | ✓ | ✓ | ✓ | — |
| Borrar gatos | ✓ | ✓ | — | — |
| Cambiar estado CER | ✓ | ✓ | ✓ | — |
| Añadir eventos / recordatorios | ✓ | ✓ | ✓ | ✓ |
| Borrar recordatorios | ✓ | ✓ | — | — |
| Gestionar plantillas de turno | ✓ | ✓ | — | — |
| Apuntarse / completar turnos | ✓ | ✓ | ✓ | — |
| Asignar turnos a otros | ✓ | ✓ | — | — |
| Gestionar miembros | ✓ | — | — | — |

`super_admin` (global, fuera de la org) puede todo en todas las orgs.

## 5. Autenticación e invitaciones

- **Sesiones**: Supabase Auth (JWT). El cliente está configurado con
  `persistSession`, `autoRefreshToken`, `detectSessionInUrl`.
- **El listener** (`onAuthStateChange` + `getSession()` inicial) en
  `useFelinaStore.js` carga los datos al iniciar sesión. Compara `userId` entre
  eventos para **no** resetear la vista en refrescos de token o re-emisiones al
  volver el navegador del segundo plano.
- **Bootstrap del super_admin**: se crea el usuario en Supabase Auth y se marca
  `update profiles set super_admin = true where id = ...`. El trigger
  `guard_super_admin_change` permite ese cambio cuando `auth.uid()` es null
  (SQL Editor / service_role), que es la única vía para crear el primero.
- **Invitaciones**: el admin de una org invita por email. La Edge Function
  `invite-member` decide: si la persona ya tiene cuenta la añade directa; si no,
  llama a `auth.admin.inviteUserByEmail` con metadata `invited_org_id` /
  `invited_role`. El trigger `handle_new_user` (migración `0005`) crea la
  membership automáticamente al activarse la cuenta.
- **Set-password / recuperación**: al llegar desde un email de invitación o
  recuperación, `supabaseClient.js` detecta `type=invite|recovery` en el hash
  **o** la query (PKCE) y la app muestra `SetPasswordScreen` antes de dejar usar
  la app.

## 6. Migraciones de base de datos

Viven en `supabase/migrations/`, versionadas en git. **Se aplican a mano**
copiando-pegando el SQL en el **SQL Editor** del dashboard de Supabase (no se
usa la CLI de Supabase). Orden importa — aplicar en orden numérico:

| Migración | Qué hace |
|---|---|
| `0001_init_users_orgs_colonies` | orgs, profiles, memberships, colonies + RLS + helpers + triggers de auth |
| `0002_profiles_email` | añade `email` a profiles (para lookups de invitación) |
| `0003_cats_and_events` | tablas cats y events + enums |
| `0004_shifts` | shift_templates y shifts + enums |
| `0005_invitation_membership` | extiende `handle_new_user` para crear membership desde invitación |
| `0006_cat_photos` | columna `photo_url`, bucket `cat-photos`, RLS de Storage |
| `0007_cat_reminders` | tabla cat_reminders + RLS |

**Si montas el proyecto desde cero** en un Supabase nuevo: aplica `0001`→`0007`
en orden, crea tu usuario en Auth, márcalo super_admin por SQL, configura SMTP
(Resend) y las URL de Auth (ver despliegue).

## 7. Edge Functions

`supabase/functions/invite-member/` — única función. Se despliega desde el
dashboard de Supabase (Edge Functions → editor → pegar `index.ts` → Deploy).
Tiene acceso automático a `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
`SUPABASE_SERVICE_ROLE_KEY` (inyectadas por Supabase). Verifica que quien llama
es admin de la org (vía su JWT) antes de invitar.

## 8. Despliegue

**Frontend (automático):**

1. Merge a `main` en GitHub (`dalbian/felina`).
2. Cloudflare Pages detecta el push y ejecuta `npm run build`.
3. Despliega `dist/` y publica en `gestiofelina.org` (~2-3 min).

Variables de entorno configuradas en Cloudflare Pages → Settings →
Variables and Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. **Si las
cambias hay que re-desplegar** (Vite las inlinea en build time, no runtime).

**Base de datos:** migraciones a mano en SQL Editor (ver sección 6).

**Edge Functions:** a mano desde el dashboard (ver sección 7).

**Supabase Auth → URL Configuration** (crítico, si no el login/recuperación
falla en producción):

- Site URL: `https://gestiofelina.org`
- Redirect URLs: `https://gestiofelina.org`, `https://gestiofelina.org/**`,
  `https://www.gestiofelina.org`, `https://www.gestiofelina.org/**`,
  `https://felina-512.pages.dev`, `.../**`, `http://localhost:5173`, `.../**`

**Supabase Auth → Email Templates** (plantillas de invitación y recuperación en
catalán): los textos están versionados en **[docs/EMAILS-SUPABASE.md](EMAILS-SUPABASE.md)**.
Se editan a mano en el dashboard (Authentication → Emails). Felina solo usa las
plantillas *Invite user* y *Reset Password*.

## 9. Servicios externos y costes

| Servicio | Para qué | Plan | Coste |
|---|---|---|---|
| Supabase | BD + Auth + Storage + Functions | Free | 0 € (se pausa tras 7 días sin uso; despausar desde dashboard) |
| Cloudflare Pages | Hosting + CI/CD | Free | 0 € |
| Cloudflare Registrar | Dominio `gestiofelina.org` | — | ~10 $/año |
| Resend | Email transaccional | Free | 0 € (3.000 emails/mes) |

Coste real hoy: **~10 $/año** (solo el dominio). Las cuentas de Supabase y
Cloudflare tienen 2FA activado — críticas, no perder acceso.

## 10. Cómo retomar el proyecto

Si vuelves tras meses:

1. `git clone` (o `git pull` en la copia que tengas) → `npm install`.
2. Crea `.env.local` con URL + publishable key (Supabase → Settings → API).
3. **Comprueba que el proyecto Supabase no esté pausado** (plan free se pausa a
   los 7 días sin actividad). Si lo está, "Restore" desde el dashboard. Los datos
   no se pierden.
4. `npm run dev` → verifica login.
5. Para cambios: rama nueva → cambios → `npm run test` → commit → PR a `main`
   → merge → Cloudflare despliega solo.
6. Si tocas el esquema: nueva migración numerada en `supabase/migrations/`,
   aplícala a mano en el SQL Editor, **y déjala commiteada** para que quede
   versionada.

## 11. Decisiones de diseño y gotchas

Cosas que costaron un rato entender y conviene no reaprender:

- **Site URL de Supabase**: por defecto es `http://localhost:3000`. Si no se
  cambia a `https://gestiofelina.org`, los emails de invitación/recuperación
  apuntan a localhost. Ya está configurado, pero si creas otro proyecto Supabase,
  recuérdalo.
- **PKCE vs hash**: supabase-js v2 moderno puede devolver el `type` del flujo
  de auth en query string (PKCE), no solo en el hash. `supabaseClient.js`
  comprueba ambos. No simplificar a solo-hash.
- **Listener de auth y reset de vista**: el listener ignora eventos cuyo
  `userId` no cambió (token refresh, USER_UPDATED, re-emisión al volver del
  segundo plano). Si no, la vista se reseteaba sola al minimizar el navegador.
- **Fechas → NaN**: Postgres devuelve timestamps como string ISO. Los mappers
  los pasan a ms con `toMs()`. Si añades un campo fecha nuevo y olvidas el
  mapper, verás "NaN" en la UI.
- **Variables de entorno en build time**: Vite las inlinea al compilar. Cambiar
  una env var en Cloudflare **requiere re-deploy**, no basta con guardar.
- **El cliente usa la publishable key** (`sb_publishable_...`), que es pública
  a propósito. No es un fallo de seguridad: las RLS son la barrera real.
- **`storage.foldername(name)[1]::uuid`** en las RLS de Storage: si el path no
  empieza por un uuid válido, el cast falla y la policy bloquea — comportamiento
  correcto (rechaza subidas con path mal formado).
- **No nombrar variables locales `t`**: el hook de i18n (sección 12) expone la
  función de traducción como `const { t } = useTranslation()`. Es común caer en
  `const t = SHIFT_TASKS[...]` o `arr.find(t => t.id === id)`, lo que hace
  *shadow* del hook y la pantalla se queda en blanco (o pinta el `.label` literal
  de constants en castellano sin traducir). En el código actual se usa `taskCfg`
  / `tpl` / `x` en estos casos. Si añades código, evita la letra `t` para nada
  que no sea la traducción.

## 12. Internacionalización (ca/es)

Sistema bilingüe **catalán / castellano** sin dependencias externas (no usa
`react-intl`, `i18next` ni similares). Todo vive en **`src/lib/i18n.jsx`**.

### Piezas

| Elemento | Qué hace |
|---|---|
| `I18nProvider` | Context de React que envuelve toda la app en `main.jsx`. Guarda `lang`, persiste en `localStorage` y sincroniza el locale de fechas. |
| `useTranslation()` | Hook que devuelve `{ lang, setLang, t }`. Si se llama fuera del provider, fallback resiliente a castellano (no rompe el render). |
| `t(key, vars)` | Lookup + interpolación de `{placeholders}`. Si la clave falta en el idioma activo, cae al diccionario `es`; si tampoco está, devuelve la clave literal (visible pero no rompe). |
| `LanguageSwitcher` | Control segmentado `CA | ES` reutilizable. Aparece en login y en la sidebar/bottom nav. |
| `dates.js → setDateLocale(lang)` | Llamado por el provider al cambiar idioma; afecta a `fmtDate`, `fmtMonth`, `fmtRelative`, etc. (formateo de meses/días + "ahir/ayer", "fa N dies/hace N días"). |

### Detección y persistencia

1. Si hay `localStorage['felina:lang']` → se usa.
2. Si no, se mira `navigator.language` — empieza por `ca` → catalán; cualquier
   otro → castellano.
3. El selector graba la elección y refresca toda la app (re-render por context).

### Convención de claves

Namespaces por funcionalidad para evitar colisiones y facilitar grep:

```
common.*       cancel, save, edit, delete, back, optional, email, loading…
nav.*          sidebar / bottom nav
layout.*       barras superiores, selector de org, banner de superadmin
login.*        pantalla de login + bloque demo
forgot.*       recuperación de contraseña
setPwd.*       SetPasswordScreen (activar cuenta / nueva contraseña)
changePwd.*    cambiar mi contraseña
resetPwd.*     admin restablece contraseña a otra persona
rgpd.*         aviso legal del primer login
banner.*       banner "Versión inicial"
dash.*         panel/dashboard (incluye plurales upcomingOne/upcomingMany)
col.*          colonias (lista, detalle, formulario)
cats.*         lista de gatos
catDetail.*    detalle de gato + recordatorios
catForm.*      formulario de gato
eventForm.*    formulario de evento veterinario
reminderForm.* formulario de recordatorio
cal.*          calendario (mes/semana/mis turnos/plantillas)
platform.*     vista super_admin
settings.*     ajustes (org, miembros, roles, sesión, zona peligrosa, demo)
memberRow.*    fila de miembro en ajustes
invite.*       modal de invitar miembro
orgForm.*      crear/editar organización
modal.title.*  títulos de los 17 modales globales
app.noOrg.*    pantalla "usuario sin organización"
app.suspended.* pantalla "organización suspendida"
app.notify.*   notify desde App.jsx (Sin permiso, Restablecer contraseña)
store.*        notify y confirmAsync desde useFelinaStore.js (~70 claves)
role.X.{label,short,description}        traducciones por rol
cer.X.{label,short}                     estados CER
event.X.label                           tipos de evento veterinario
task.X.{label,short}                    tareas de turno
slot.X.{label,short}                    franjas (mañana/tarde)
day.N.{label,short}                     días de la semana (0=domingo)
sex.{H,M,D}                             sexo del gato
confirm.accept                          default del ConfirmDialog
```

### Interpolación

`{placeholder}` se sustituye en orden. Para incluir énfasis o `<strong>` dentro
de una traducción, se reparte la cadena con `split('{var}')`:

```jsx
const [before, after = ''] = t('app.suspended.body').split('{org}');
return <>{before}<strong>{currentOrg.name}</strong>{after}</>;
```

Patrón usado en pantallas "organización suspendida", `SetPasswordScreen` y
`ResetPasswordForm`.

### Plurales

No hay regla automática (sería overkill para 2 idiomas con plural simple). Se
gestionan con claves `*One` / `*Many` y un `if` en el componente:

```jsx
{members.length === 1
  ? t('settings.members.countOne', { n: members.length })
  : t('settings.members.countMany', { n: members.length })}
```

### Añadir una traducción nueva

1. Decide el namespace (`col.*`, `cats.*`, etc.) y abre `src/lib/i18n.jsx`.
2. Añade la clave al bloque `es:` con la cadena castellana.
3. Añade la **misma** clave al bloque `ca:` con la cadena catalana.
4. Úsala en el componente: `const { t } = useTranslation()` + `t('mi.clave')`.

Si añades **un idioma nuevo** (p.ej. gallego): añade `'gl'` al array `LANGS`,
crea el bloque `gl:` con todas las claves, ajusta `detectInitialLang()` para
detectarlo, y actualiza el control segmentado en `LanguageSwitcher`.

### `constants.js` solo contiene presentación visual

Tras la migración i18n, `constants.js` (y `SHIFT_SLOT_META` en `lib/shifts.js`)
**ya no guardan texto**: los campos `.label`/`.short`/`.description` se eliminaron
porque todas las etiquetas se resuelven por `t('cer.X.short')`, `t('role.X.label')`,
`t('event.X.label')`, etc. Lo que queda son los campos no textuales que los
componentes necesitan para pintar: `.color`, `.bg`, `.dot`, `.icon`, y `n` (índice
de día en `DAYS_OF_WEEK`). `SEX_OPTIONS` (objeto con valores en castellano) se
sustituyó por `SEX_VALUES = ['H','M','D']`.

Regla para mantenerlo: si añades un estado/rol/tipo nuevo, pon aquí solo su
color/icono y la etiqueta en los dos diccionarios (`es`/`ca`) de `i18n.jsx`. No
vuelvas a meter texto en `constants.js`.
