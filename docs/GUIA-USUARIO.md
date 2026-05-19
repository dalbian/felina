# Guía de usuario — Felina

Manual para las personas de la protectora que usan la aplicación: voluntarias,
coordinación y administración. No hace falta saber de informática.

La aplicación está en **https://gestiofelina.org**. Funciona desde el móvil y
desde el ordenador, con el navegador (Chrome, Firefox, Safari…). No hay que
instalar nada.

## Índice

1. [Qué es Felina](#1-qué-es-felina)
2. [Entrar en la aplicación](#2-entrar-en-la-aplicación)
3. [Los roles: quién puede hacer qué](#3-los-roles-quién-puede-hacer-qué)
4. [El panel de inicio](#4-el-panel-de-inicio)
5. [Colonias](#5-colonias)
6. [Gatos](#6-gatos)
7. [Historial veterinario](#7-historial-veterinario)
8. [Recordatorios médicos](#8-recordatorios-médicos)
9. [Calendario y turnos](#9-calendario-y-turnos)
10. [Gestionar el equipo (solo administración)](#10-gestionar-el-equipo-solo-administración)
11. [Tu cuenta](#11-tu-cuenta)
12. [Preguntas frecuentes](#12-preguntas-frecuentes)

---

## 1. Qué es Felina

Una herramienta para llevar el día a día de las colonias de gatos: dónde están,
qué gatos hay en cada una, su estado dentro del programa CER
(Captura–Esterilización–Retorno), su historial veterinario, qué le toca a cada
gato (próxima vacuna, desparasitación…) y los turnos de quién cuida cada colonia.

Cada protectora tiene su espacio independiente. **Nadie de otra protectora ve
vuestros datos.** Están guardados en un servidor europeo de forma segura.

## 2. Entrar en la aplicación

### Si te han invitado (primera vez)

La administración de tu protectora te invita con tu email. Recibirás un correo
de `noreply@gestiofelina.org` con un enlace.

> Las primeras veces el correo puede tardar unos minutos y **puede caer en la
> carpeta de spam**. Si no lo ves, mira ahí.

1. Pulsa el enlace del email.
2. Te lleva a una pantalla para **definir tu contraseña**.
3. Eliges una contraseña, la confirmas, y entras directamente.

Ya estás dentro y formas parte de tu protectora con el rol que te hayan asignado.

### Si ya tienes cuenta

Entra en https://gestiofelina.org, escribe tu email y contraseña, y pulsa
**Entrar**.

### Si olvidaste tu contraseña

En la pantalla de inicio, pulsa **"¿He olvidado mi contraseña?"**, escribe tu
email y pulsa enviar. Recibirás un correo con un enlace para poner una
contraseña nueva.

## 3. Los roles: quién puede hacer qué

Cuando te dan de alta te asignan un **rol**. Define qué puedes hacer:

| Rol | Qué puede hacer |
|---|---|
| **Administrador/a** | Todo: gestiona la organización, el equipo, y todos los datos. |
| **Coordinador/a** | Gestiona colonias, gatos, historial y turnos. No gestiona al equipo. |
| **Voluntario/a** | Añade y edita gatos, registra eventos y recordatorios, se apunta a turnos. No borra registros. |
| **Veterinario/a** | Solo lectura + registrar eventos veterinarios y recordatorios. |

Si intentas algo que tu rol no permite, la app te avisa con un mensaje. No es un
error: es que esa acción es para otro rol. Habla con la administración si crees
que necesitas más permisos.

## 4. El panel de inicio

Al entrar ves el **panel** con un resumen de tu organización:

- Número de colonias, gatos, porcentaje de esterilizados, gatos por capturar.
- **Aviso de turnos** sin cubrir esta semana (si los hay).
- **Aviso de recordatorios** vencidos o próximos (si los hay) — pulsando uno
  vas directo a la ficha de ese gato.
- Últimas intervenciones veterinarias y lista de colonias.

El menú lateral (o inferior en móvil) te lleva a cada sección: Panel, Colonias,
Gatos, Mapa, Calendario, Ajustes.

## 5. Colonias

Una colonia es un grupo de gatos en un sitio concreto.

- **Verlas**: sección **Colonias**. Cada tarjeta muestra nombre y nº de gatos.
- **En el mapa**: sección **Mapa**. Las colonias con ubicación aparecen como
  marcadores. Desde el mapa también puedes crear una colonia pulsando en el sitio.
- **Crear una**: botón **Añadir colonia**. Pon nombre, dirección, cuidadores y
  notas. La ubicación (lat/lng) es opcional pero recomendable para el mapa.
- **Editar / borrar**: entra en el detalle de la colonia. (Borrar: solo
  administración o coordinación, y solo si la colonia no tiene gatos.)

## 6. Gatos

- **Verlos**: sección **Gatos**, o dentro del detalle de una colonia.
- **Crear uno**: **Añadir gato**. Campos: nombre, sexo, color/pelaje, colonia,
  estado CER, edad estimada, microchip, señas, notas y **foto**.
- **Foto**: pulsa el botón de cámara en el formulario. Puedes cambiarla o
  quitarla (la "X" roja). Se guarda al confirmar la ficha.
- **Estado CER**: en la ficha del gato, pulsa la etiqueta de estado para
  cambiarlo. Estados: Pendiente captura → Capturado → Esterilizado → En colonia
  / En acogida / Adoptado / Fallecido.
- **Editar / borrar**: botones en la ficha. (Borrar: solo admin/coordinación.)

El campo **Notas** es para cosas generales del gato (carácter, historia,
peculiaridades). Lo médico va en el historial veterinario, no aquí.

## 7. Historial veterinario

En la ficha de cada gato, sección **Historial veterinario**: la lista
cronológica de lo que se le ha hecho.

- **Añadir evento**: tipo (esterilización, vacunación, desparasitación,
  consulta, tratamiento), fecha, veterinario/centro, coste y observaciones.
- Es un registro de lo que **ya pasó**. Para lo que está **pendiente**, usa los
  recordatorios (siguiente sección).

## 8. Recordatorios médicos

En la ficha del gato, sección **Recordatorios** (icono de campana). Sirven para
no olvidar lo que le toca a cada gato.

- **Añadir recordatorio**: tipo, fecha prevista, título opcional (ej.: "Vacuna
  trivalente anual") y notas.
- Los pendientes se ordenan por fecha. Se marcan visualmente:
  - **Vencido** (fondo rojizo): se pasó la fecha.
  - **Hoy**: toca hoy.
  - Sin marca: futuro.
- **Marcar como hecho**: icono de check verde. El recordatorio pasa a
  "completados" (colapsados abajo) con la fecha y quién lo hizo.
- **Deshacer**: en completados, vuelve a pendiente.
- **Editar / borrar**: iconos en cada fila. (Borrar: solo admin/coordinación.)

Marcar un recordatorio como hecho **no** crea un evento veterinario
automáticamente. Si quieres dejarlo también en el historial (con coste,
veterinario…), añade además el evento desde "Historial veterinario".

Los recordatorios vencidos y próximos también aparecen en el **panel de inicio**
para que no se pasen.

## 9. Calendario y turnos

Sección **Calendario**. Organiza quién cuida cada colonia y cuándo.

- **Plantillas** (las crea admin/coordinación): un patrón recurrente, ej.
  "Plaça del Pi, lunes y miércoles, mañana, alimentación". Genera turnos
  automáticamente en el calendario.
- **Franjas**: mañana / tarde (sin hora exacta — basta el día).
- **Apuntarse a un turno**: pulsa un turno libre → **Apuntarme**. Queda asignado
  a ti.
- **Desapuntarse**: vuelve a quedar libre.
- **Asignar a otra persona** (admin/coordinación): desde el turno, "Asignar".
- **Completar**: cuando hagas el turno, márcalo como hecho. Queda registrado con
  tu nombre y la fecha.
- Vistas: **Mes**, **Semana**, **Mis turnos** (los tuyos), **Plantillas**.

Los turnos sin cubrir de la semana aparecen como aviso en el panel de inicio.

## 10. Gestionar el equipo (solo administración)

Sección **Ajustes** → lista de miembros.

- **Añadir miembro**: introduce su email y elige rol. Se le envía un email de
  invitación; cuando lo acepte y defina contraseña, entra ya como miembro.
- **Cambiar rol**: menú `⋯` junto a cada persona → Cambiar rol.
- **Expulsar**: menú `⋯` → expulsar (su histórico se conserva, pierde acceso).
- También desde Ajustes: editar los datos de la organización, salir de la
  organización, o eliminarla (acción irreversible, con confirmación).

## 11. Tu cuenta

En **Ajustes**, en la zona de tu sesión:

- **Cambiar contraseña**: pide la actual y la nueva.
- **Cerrar sesión**.

Si perteneces a varias organizaciones, puedes cambiar entre ellas desde el
selector de organización en la barra lateral.

## 12. Preguntas frecuentes

**¿Pierdo los datos si cierro el navegador o cambio de móvil?**
No. Todo se guarda en el servidor. Puedes entrar desde cualquier dispositivo con
tu email y contraseña y verás lo mismo.

**No me llega el email de invitación / recuperación.**
Espera unos minutos y mira la carpeta de **spam**. Si tras un rato no llega,
avisa a la administración de tu protectora.

**Me sale "no perteneces a ninguna organización".**
Tu cuenta existe pero aún no te han asignado a una protectora. Pide a la
administración que te añada con tu email.

**Veo un aviso de "Sin permiso".**
Esa acción es para otro rol. No es un fallo. Habla con la administración si
necesitas más permisos.

**Aparece un banner "Versión inicial · si encuentras algo raro, escríbenos".**
La app es nueva y se sigue puliendo. Si algo se ve raro o se atasca, comunícalo
— ese feedback es lo que la hace mejor.

**¿Otras protectoras ven nuestros gatos / colonias?**
No. Cada organización está aislada. Solo las personas que tu administración
autorice ven vuestros datos.
