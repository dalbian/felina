// Sistema de internacionalización ligero (sin dependencias externas).
//
// Diseño:
//   - Diccionarios planos por idioma con claves namespaced ('login.enter').
//   - t(key, vars) hace lookup + interpolación de {placeholders}. Si falta
//     la clave, devuelve la clave misma (visible pero no rompe).
//   - El idioma vive en un Context de React para que cambiarlo re-renderice
//     toda la app. Se persiste en localStorage y, al cambiarlo, se actualiza
//     también el locale de fechas (dates.js).
//   - Idioma inicial: el guardado; si no hay, se detecta del navegador
//     (catalán si procede, castellano en caso contrario).
//
// Estado actual: Fase A (prueba de concepto). Traducidos login + dashboard
// + banner. El resto de pantallas se irán migrando en fases siguientes;
// las claves que aún no existan caen al texto en castellano por defecto
// porque los componentes no migrados siguen con strings hardcoded.

import { createContext, useContext, useState, useCallback } from 'react';
import { setDateLocale } from './dates.js';

const STORAGE_KEY = 'felina:lang';
export const LANGS = ['ca', 'es'];

const detectInitialLang = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ca' || saved === 'es') return saved;
  } catch { /* modo incógnito restrictivo, etc. */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'es';
  return nav.toLowerCase().startsWith('ca') ? 'ca' : 'es';
};

// ─────────────────────────────────────────────────────────────────────────────
// DICCIONARIOS
// ─────────────────────────────────────────────────────────────────────────────
const dict = {
  es: {
    'common.email': 'Email',
    'common.cancel': 'Cancelar',
    'common.brandTag': 'gestión CER',
    'common.loading': 'Cargando…',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.back': 'Volver',
    'common.optional': '(opcional)',

    'banner.short': 'Versión inicial',
    'banner.long': ' · si encuentras algo raro, escríbenos',

    // Navegación (sidebar y bottom nav)
    'nav.platform': 'Plataforma',
    'nav.dashboard': 'Panel',
    'nav.colonies': 'Colonias',
    'nav.map': 'Mapa',
    'nav.cats': 'Gatos',
    'nav.calendar': 'Calendario',
    'nav.settings': 'Ajustes',

    // Sidebar y selector de organización
    'layout.platform': 'Plataforma',
    'layout.superAdminBadge': 'Super admin',
    'layout.superAdminShort': 'Superadmin',
    'layout.backToPlatform': 'Volver a Plataforma',
    'layout.allOrgs': 'Todas las organizaciones',
    'layout.yourOrgs': 'Tus organizaciones',
    'layout.suspended': 'suspendida',
    'layout.logout': 'Cerrar sesión',
    'layout.adminBanner.viewing': 'Estás viendo',
    'layout.adminBanner.as': 'como superadministrador',
    'layout.adminBanner.suspended': 'Suspendida',
    'layout.adminBanner.back': '← Volver',
    'layout.adminBanner.backLong': '← Volver a Plataforma',

    // Roles
    'role.admin.label': 'Administrador/a',
    'role.admin.short': 'Admin',
    'role.admin.description': 'Acceso total: gestiona organización, miembros y datos.',
    'role.coordinator.label': 'Coordinador/a',
    'role.coordinator.short': 'Coordinador',
    'role.coordinator.description': 'Gestiona colonias, gatos e historial. No administra al equipo.',
    'role.volunteer.label': 'Voluntario/a',
    'role.volunteer.short': 'Voluntario',
    'role.volunteer.description': 'Puede añadir gatos y eventos. No elimina registros.',
    'role.vet.label': 'Veterinario/a',
    'role.vet.short': 'Veterinario',
    'role.vet.description': 'Solo lectura + registro de eventos veterinarios.',

    // Estados CER
    'cer.pendiente.label': 'Pendiente captura',
    'cer.pendiente.short': 'Pendiente',
    'cer.capturado.label': 'Capturado',
    'cer.capturado.short': 'Capturado',
    'cer.esterilizado.label': 'Esterilizado',
    'cer.esterilizado.short': 'CER hecho',
    'cer.en_colonia.label': 'En colonia',
    'cer.en_colonia.short': 'En colonia',
    'cer.en_acogida.label': 'En acogida',
    'cer.en_acogida.short': 'Acogida',
    'cer.adoptado.label': 'Adoptado',
    'cer.adoptado.short': 'Adoptado',
    'cer.fallecido.label': 'Fallecido',
    'cer.fallecido.short': '✝',

    // Tipos de evento veterinario
    'event.esterilizacion.label': 'Esterilización',
    'event.vacunacion.label': 'Vacunación',
    'event.desparasitacion.label': 'Desparasitación',
    'event.consulta.label': 'Consulta vet.',
    'event.tratamiento.label': 'Tratamiento',

    // Tareas de turno
    'task.alimentacion.label': 'Alimentación',
    'task.alimentacion.short': 'Comida',
    'task.agua_limpieza.label': 'Agua y limpieza',
    'task.agua_limpieza.short': 'Limpieza',
    'task.observacion.label': 'Observación',
    'task.observacion.short': 'Control',
    'task.medicacion.label': 'Medicación',
    'task.medicacion.short': 'Medic.',
    'task.otros.label': 'Otros',
    'task.otros.short': 'Otros',

    // Franjas de turno
    'slot.morning.label': 'Mañana',
    'slot.morning.short': 'Mañana',
    'slot.afternoon.label': 'Tarde',
    'slot.afternoon.short': 'Tarde',

    // Días de la semana (clave por número 0..6, domingo=0)
    'day.0.label': 'Domingo', 'day.0.short': 'D',
    'day.1.label': 'Lunes',   'day.1.short': 'L',
    'day.2.label': 'Martes',  'day.2.short': 'M',
    'day.3.label': 'Miércoles','day.3.short': 'X',
    'day.4.label': 'Jueves',  'day.4.short': 'J',
    'day.5.label': 'Viernes', 'day.5.short': 'V',
    'day.6.label': 'Sábado',  'day.6.short': 'S',

    // Sexo
    'sex.H': 'Hembra',
    'sex.M': 'Macho',
    'sex.D': 'Desconocido',

    // ─── Calendario ───
    'cal.title': 'Calendario',
    'cal.subtitle': 'Turnos de voluntariado y cuidado de las colonias.',
    'cal.newTemplate': 'Nueva plantilla',
    'cal.tab.month': 'Mes',
    'cal.tab.week': 'Semana',
    'cal.tab.mine': 'Mis turnos',
    'cal.tab.templates': 'Plantillas',
    'cal.allColonies': 'Todas las colonias',
    'cal.allTasks': 'Todas las tareas',
    'cal.today': 'Hoy',
    'cal.thisWeek': 'Esta semana',
    'cal.weekOf': 'Semana del {range}',
    'cal.uncoveredTooltip': '{n} sin cubrir',
    'cal.moreCount': '+ {n} más',
    'cal.legend': 'Leyenda',
    'cal.uncovered': 'Sin cubrir',
    'cal.todayBadge': 'hoy',
    'cal.noShiftsScheduled': 'Sin turnos programados',
    'cal.dayNoShifts': 'Sin turnos programados este día.',
    'cal.chipFree': 'Libre',
    'cal.row.done': 'Hecho',

    'cal.detail.date': 'Fecha',
    'cal.detail.slot': 'Franja',
    'cal.detail.completed': 'Completado',
    'cal.detail.by': 'Por',
    'cal.detail.instructions': 'Instrucciones',
    'cal.detail.assignedTo': 'Asignado a',
    'cal.detail.openTitle': 'Turno libre',
    'cal.detail.claim': 'Apuntarme a este turno',
    'cal.detail.assignOther': 'Asignar a otra persona',
    'cal.detail.reassign': 'Reasignar',
    'cal.detail.markDone': 'Marcar como hecho',
    'cal.detail.leaveFree': 'Dejar el turno libre',
    'cal.detail.unassign': 'Desasignar',
    'cal.detail.undoComplete': 'Deshacer completado',
    'cal.detail.editTemplate': 'Editar plantilla recurrente',

    'cal.assign.to': 'Asignar a',
    'cal.assign.btn': 'Asignar',

    'cal.tpl.colony': 'Colonia',
    'cal.tpl.task': 'Tarea',
    'cal.tpl.daysOfWeek': 'Días de la semana',
    'cal.tpl.slot': 'Franja del día',
    'cal.tpl.notes': 'Observaciones',
    'cal.tpl.notesPlaceholder': 'Instrucciones para los voluntarios…',
    'cal.tpl.activeLabel': 'Plantilla activa (genera turnos)',
    'cal.tpl.delete': 'Eliminar',
    'cal.tpl.save': 'Guardar cambios',
    'cal.tpl.create': 'Crear plantilla',
    'cal.tpl.preset.all': 'Todos los días',
    'cal.tpl.preset.weekdays': 'L-V',
    'cal.tpl.preset.weekend': 'Fin de semana',
    'cal.tpl.preset.mwf': 'L-X-V',
    'cal.tpl.allDaysShort': 'Todos los días',
    'cal.tpl.inactive': 'inactiva',
    'cal.tpl.empty': 'Sin plantillas de turnos',
    'cal.tpl.emptyDesc': 'Crea una plantilla para definir turnos recurrentes en una colonia.',
    'cal.tpl.createFirst': 'Crear primera plantilla',
    'cal.tpl.countOne': 'plantilla',
    'cal.tpl.countMany': 'plantillas',

    'cal.mine.upcoming': 'Mis próximos turnos',
    'cal.mine.empty': 'No tienes turnos asignados',
    'cal.mine.emptyClaim': 'Apúntate a un turno libre más abajo.',
    'cal.mine.emptyWait': 'Espera a que un coordinador te asigne uno.',
    'cal.mine.openShifts': 'Turnos libres',
    'cal.mine.recentDone': 'Últimos completados',

    // ─── Plataforma (vista super_admin) ───
    'platform.kicker': 'Superadministración',
    'platform.title': 'Plataforma',
    'platform.subtitle': 'Gestión global de todas las organizaciones dadas de alta en la plataforma. Desde aquí puedes crear, suspender, eliminar o auditar cualquier organización.',
    'platform.newOrg': 'Nueva organización',
    'platform.logout': 'Salir',
    'platform.stat.orgs': 'Organizaciones',
    'platform.stat.orgsAllActive': 'todas activas',
    'platform.stat.orgsSuspended': '{n} suspendidas',
    'platform.stat.users': 'Usuarios',
    'platform.stat.usersSuper': '{n} super admin',
    'platform.stat.colonies': 'Colonias',
    'platform.stat.totalCats': 'Gatos totales',
    'platform.tab.orgs': 'Organizaciones ({n})',
    'platform.tab.users': 'Usuarios ({n})',
    'platform.orgs.empty': 'Sin organizaciones',
    'platform.orgs.emptyDesc': 'Crea la primera organización para empezar.',
    'platform.orgs.searchPh': 'Buscar por nombre, ciudad o email…',
    'platform.orgs.clearTitle': 'Limpiar',
    'platform.orgs.countOne': '{n} organización',
    'platform.orgs.countMany': '{n} organizaciones',
    'platform.orgs.countOf': '{n} de {total}',
    'platform.orgs.noResults': 'Ninguna organización coincide con "{q}".',
    'platform.users.searchPh': 'Buscar por nombre o email…',
    'platform.users.allOrgs': 'Todas las organizaciones',
    'platform.users.onlySuper': 'Solo superadministradores',
    'platform.users.filterByOrg': 'Filtrar por organización',
    'platform.users.countOne': '{n} usuario',
    'platform.users.countMany': '{n} usuarios',
    'platform.users.noResults': 'Ningún usuario coincide con los filtros actuales.',
    'platform.userRow.superAdmin': 'Super administrador',
    'platform.userRow.orgsOne': '{n} organización',
    'platform.userRow.orgsMany': '{n} organizaciones',
    'platform.userRow.resetPwd': 'Resetear contraseña',
    'platform.userRow.removeSuper': 'Quitar superadmin',
    'platform.userRow.makeSuper': 'Hacer superadmin',
    'platform.orgRow.suspended': 'Suspendida',
    'platform.orgRow.noCity': 'Sin ciudad',
    'platform.orgRow.members': 'Miembros',
    'platform.orgRow.noAdmin': '⚠ sin admin',
    'platform.orgRow.adminCount': '{n} admin',
    'platform.orgRow.colonies': 'Colonias',
    'platform.orgRow.cats': 'Gatos',
    'platform.orgRow.created': 'Creada',
    'platform.orgRow.enter': 'Entrar',
    'platform.orgRow.editInfo': 'Editar información',
    'platform.orgRow.reactivate': 'Reactivar',
    'platform.orgRow.suspend': 'Suspender',
    'platform.orgRow.delete': 'Eliminar permanentemente',

    // ─── Títulos de los modales globales ───
    'modal.title.addColony': 'Nueva colonia',
    'modal.title.editColony': 'Editar colonia',
    'modal.title.addCat': 'Nuevo gato',
    'modal.title.editCat': 'Editar gato',
    'modal.title.addEvent': 'Nuevo evento veterinario',
    'modal.title.addReminder': 'Nuevo recordatorio',
    'modal.title.editReminder': 'Editar recordatorio',
    'modal.title.createOrg': 'Nueva organización',
    'modal.title.editOrg': 'Editar organización',
    'modal.title.platformCreateOrg': 'Crear organización desde plataforma',
    'modal.title.changeMyPassword': 'Cambiar contraseña',
    'modal.title.resetPassword': 'Restablecer contraseña',
    'modal.title.addTemplate': 'Nueva plantilla de turno',
    'modal.title.editTemplate': 'Editar plantilla de turno',
    'modal.title.viewShift': 'Detalle del turno',
    'modal.title.assignShift': 'Asignar turno',

    // ─── Vista Colonias (lista y detalle) ───
    'col.kicker': 'Gestión',
    'col.title': 'Colonias',
    'col.newColony': 'Nueva colonia',
    'col.searchPh': 'Buscar por nombre o dirección…',
    'col.empty': 'No hay colonias',
    'col.emptyDesc': 'Empieza añadiendo la primera colonia que gestiona tu organización.',
    'col.createColony': 'Crear colonia',
    'col.cardCats': 'Gatos',
    'col.cardCer': 'CER',
    'col.detail.kicker': 'Colonia',
    'col.detail.statsCats': 'Gatos fichados',
    'col.detail.statsSterilized': 'Esterilizados',
    'col.detail.statsCarers': 'Cuidadores',
    'col.detail.notesLabel': 'Notas',
    'col.detail.catsTitle': 'Gatos en esta colonia',
    'col.detail.addCat': 'Añadir gato',
    'col.detail.emptyCats': 'Ningún gato fichado',
    'col.detail.emptyCatsDesc': 'Añade los gatos que viven en esta colonia para empezar su seguimiento.',
    'col.detail.addFirstCat': 'Añadir primer gato',
    'col.form.nameLabel': 'Nombre de la colonia *',
    'col.form.namePh': 'Plaça del Pi, Parc Nord…',
    'col.form.addressLabel': 'Dirección / zona',
    'col.form.addressPh': 'Barri Gòtic, Barcelona',
    'col.form.carersLabel': 'Cuidadores asignados',
    'col.form.carersPh': 'Marta, Jordi…',
    'col.form.coordsLabel': 'Coordenadas (opcional, para el mapa)',
    'col.form.latPh': 'Latitud (41.382)',
    'col.form.lngPh': 'Longitud (2.174)',
    'col.form.fromMapNote': 'Coordenadas tomadas del mapa. Puedes ajustarlas si hace falta.',
    'col.form.coordsHint': 'También puedes dejarlas vacías y añadirlas más tarde tocando sobre el mapa.',
    'col.form.notesLabel': 'Notas sobre la colonia',
    'col.form.notesPh': 'Acceso, horarios, acuerdos con el ayuntamiento…',

    // ─── Vista Gatos (lista) ───
    'cats.kicker': 'Censo',
    'cats.title': 'Gatos',
    'cats.newCat': 'Nuevo gato',
    'cats.searchPh': 'Buscar por nombre o color…',
    'cats.filterAll': 'Todos',
    'cats.emptyResults': 'Sin resultados',
    'cats.emptyResultsInColony': 'No hay gatos en "{name}" que coincidan con los filtros.',
    'cats.emptyResultsGeneric': 'No hay gatos que coincidan con esta búsqueda o filtro.',

    // ─── Detalle de gato ───
    'catDetail.editCardBtn': 'Editar ficha',
    'catDetail.kicker': 'Ficha individual',
    'catDetail.field.colony': 'Colonia',
    'catDetail.field.age': 'Edad estimada',
    'catDetail.field.color': 'Color / pelaje',
    'catDetail.field.microchip': 'Microchip',
    'catDetail.field.signs': 'Señas identificativas',
    'catDetail.notesLabel': 'Notas',
    'catDetail.reminders': 'Recordatorios',
    'catDetail.addReminder': 'Añadir recordatorio',
    'catDetail.emptyReminders': 'No hay recordatorios para este gato. Añade uno para que no se te pase la próxima vacuna o desparasitación.',
    'catDetail.rem.markDone': 'Marcar como hecho',
    'catDetail.rem.showCompleted': 'Ver completados ({n})',
    'catDetail.rem.hideCompleted': 'Ocultar completados ({n})',
    'catDetail.rem.completedBy': 'Hecho {date} por {name}',
    'catDetail.rem.completedNoBy': 'Hecho {date}',
    'catDetail.rem.undo': 'Deshacer',
    'catDetail.history': 'Historial veterinario',
    'catDetail.addEvent': 'Añadir evento',
    'catDetail.emptyEvents': 'Sin eventos registrados',
    'catDetail.emptyEventsDesc': 'Registra esterilizaciones, vacunaciones, consultas y tratamientos para tener un historial completo.',
    'catDetail.firstEvent': 'Primer evento',
    'catDetail.eventFallback': 'Evento',
    'catDetail.otherType': 'Otro',

    // ─── Formulario de gato ───
    'catForm.photoTooBig.title': 'Foto demasiado grande',
    'catForm.photoTooBig.msg': 'La imagen supera 10 MB. Prueba con otra más ligera.',
    'catForm.changePhoto': 'Cambiar foto',
    'catForm.addPhoto': 'Añadir foto',
    'catForm.removePhoto': 'Quitar foto',
    'catForm.nameLabel': 'Nombre *',
    'catForm.namePh': 'Figa, Pelut, Nit…',
    'catForm.sexLabel': 'Sexo',
    'catForm.ageLabel': 'Edad aprox.',
    'catForm.agePh': '2 años',
    'catForm.colonyLabel': 'Colonia *',
    'catForm.cerLabel': 'Estado CER',
    'catForm.colorLabel': 'Color / pelaje',
    'catForm.colorPh': 'Atigrado marrón, negro pelo largo…',
    'catForm.signsLabel': 'Señas identificativas',
    'catForm.signsPh': 'Oreja recortada, cicatriz, heterocromía…',
    'catForm.microchipLabel': 'Microchip (si tiene)',
    'catForm.notesLabel': 'Notas',
    'catForm.notesPh': 'Carácter, observaciones, alimentación…',

    // ─── Formulario de evento veterinario ───
    'eventForm.typeLabel': 'Tipo de evento',
    'eventForm.dateLabel': 'Fecha',
    'eventForm.costLabel': 'Coste (€)',
    'eventForm.vetLabel': 'Veterinario / centro',
    'eventForm.vetPh': 'Clínica Veterinària…',
    'eventForm.notesLabel': 'Observaciones',
    'eventForm.notesPh': 'Detalles del procedimiento…',

    // ─── Formulario de recordatorio ───
    'reminderForm.typeLabel': 'Tipo',
    'reminderForm.dueDateLabel': 'Fecha prevista *',
    'reminderForm.titleLabel': 'Título',
    'reminderForm.titlePh': 'Ej.: Vacuna trivalente anual',
    'reminderForm.notesLabel': 'Notas',
    'reminderForm.notesPh': 'Indicaciones, dosis, anotaciones…',
    'reminderForm.saving': 'Guardando…',
    'reminderForm.save': 'Guardar recordatorio',

    'login.brandTag': 'gestión CER',
    'login.welcome': 'Bienvenido/a',
    'login.welcomeEm': 'de vuelta',
    'login.subtitle': 'Introduce tus credenciales para acceder a la plataforma.',
    'login.password': 'Contraseña',
    'login.enter': 'Entrar',
    'login.entering': 'Entrando…',
    'login.forgot': '¿He olvidado mi contraseña?',

    'forgot.title': 'Recuperar contraseña',
    'forgot.intro': 'Introduce el email de tu cuenta. Te enviaremos un enlace para crear una contraseña nueva.',
    'forgot.invalidEmail': 'Introduce un email válido.',
    'forgot.send': 'Enviar enlace',
    'forgot.sending': 'Enviando…',
    'forgot.sentTitle': 'Email enviado',
    'forgot.sentBody': 'Si {email} tiene cuenta en Felina, recibirás un email con instrucciones para crear una contraseña nueva. Las primeras veces puede tardar unos minutos y, si no llega, mira la carpeta de spam.',
    'forgot.back': 'Volver al login',

    'dash.kicker': 'Panel',
    'dash.title': 'Resumen',
    'dash.titleEm': 'general',
    'dash.subtitle': 'Estado actual de las colonias, gatos fichados y últimas intervenciones registradas.',
    'dash.stat.colonies': 'Colonias',
    'dash.stat.coloniesSub': 'activas',
    'dash.stat.cats': 'Gatos',
    'dash.stat.catsSub': 'fichados en la app',
    'dash.stat.sterilized': 'Esterilizados',
    'dash.stat.sterilizedSub': '{n} de {total}',
    'dash.stat.toCapture': 'Por capturar',
    'dash.stat.toCaptureAtt': 'requieren atención',
    'dash.stat.toCaptureOk': 'al día',
    'dash.shifts.uncoveredOne': '{n} turno sin cubrir esta semana',
    'dash.shifts.uncoveredMany': '{n} turnos sin cubrir esta semana',
    'dash.shifts.wellOrganized': 'Semana bien organizada',
    'dash.shifts.uncoveredDesc': 'Hay turnos programados que han quedado sin asignar. Revisa el calendario.',
    'dash.shifts.upcomingDescOne': '{n} próximo turno programado en los próximos 7 días.',
    'dash.shifts.upcomingDescMany': '{n} próximos turnos programados en los próximos 7 días.',
    'dash.shifts.goCalendar': 'Ir al calendario',
    'dash.shifts.free': 'libre',
    'dash.reminders.overdueOne': '{n} recordatorio vencido',
    'dash.reminders.overdueMany': '{n} recordatorios vencidos',
    'dash.reminders.upcomingTitle': 'Recordatorios próximos',
    'dash.reminders.overdueDesc': 'Hay revisiones médicas que se han pasado de fecha. Revisa los gatos afectados.',
    'dash.reminders.upcomingDescOne': '{n} pendiente en los próximos 30 días.',
    'dash.reminders.upcomingDescMany': '{n} pendientes en los próximos 30 días.',
    'dash.reminders.overdue': 'Vencido',
    'dash.reminders.today': 'Hoy',
    'dash.events.title': 'Últimas intervenciones',
    'dash.events.seeHistory': 'Ver historial',
    'dash.events.empty': 'Aún no hay intervenciones registradas.',
    'dash.catDeleted': 'Gato eliminado',
    'dash.colonies.title': 'Colonias',
    'dash.colonies.catCountOne': '{n} gato',
    'dash.colonies.catCountMany': '{n} gatos',
  },
  ca: {
    'common.email': 'Correu electrònic',
    'common.cancel': 'Cancel·la',
    'common.brandTag': 'gestió CER',
    'common.loading': 'Carregant…',
    'common.save': 'Desa',
    'common.delete': 'Elimina',
    'common.edit': 'Edita',
    'common.back': 'Torna',
    'common.optional': '(opcional)',

    'banner.short': 'Versió inicial',
    'banner.long': ' · si trobes res estrany, escriu-nos',

    // Navegació
    'nav.platform': 'Plataforma',
    'nav.dashboard': 'Tauler',
    'nav.colonies': 'Colònies',
    'nav.map': 'Mapa',
    'nav.cats': 'Gats',
    'nav.calendar': 'Calendari',
    'nav.settings': 'Configuració',

    // Sidebar i selector d’organització
    'layout.platform': 'Plataforma',
    'layout.superAdminBadge': 'Super admin',
    'layout.superAdminShort': 'Superadmin',
    'layout.backToPlatform': 'Torna a la Plataforma',
    'layout.allOrgs': 'Totes les organitzacions',
    'layout.yourOrgs': 'Les teves organitzacions',
    'layout.suspended': 'suspesa',
    'layout.logout': 'Tanca la sessió',
    'layout.adminBanner.viewing': 'Estàs veient',
    'layout.adminBanner.as': 'com a superadministrador',
    'layout.adminBanner.suspended': 'Suspesa',
    'layout.adminBanner.back': '← Torna',
    'layout.adminBanner.backLong': '← Torna a la Plataforma',

    // Rols
    'role.admin.label': 'Administrador/a',
    'role.admin.short': 'Admin',
    'role.admin.description': 'Accés total: gestiona l’organització, els membres i les dades.',
    'role.coordinator.label': 'Coordinador/a',
    'role.coordinator.short': 'Coordinador',
    'role.coordinator.description': 'Gestiona colònies, gats i historial. No administra l’equip.',
    'role.volunteer.label': 'Voluntari/ària',
    'role.volunteer.short': 'Voluntari',
    'role.volunteer.description': 'Pot afegir gats i esdeveniments. No elimina registres.',
    'role.vet.label': 'Veterinari/ària',
    'role.vet.short': 'Veterinari',
    'role.vet.description': 'Només lectura + registre d’esdeveniments veterinaris.',

    // Estats CER
    'cer.pendiente.label': 'Pendent de captura',
    'cer.pendiente.short': 'Pendent',
    'cer.capturado.label': 'Capturat',
    'cer.capturado.short': 'Capturat',
    'cer.esterilizado.label': 'Esterilitzat',
    'cer.esterilizado.short': 'CER fet',
    'cer.en_colonia.label': 'A la colònia',
    'cer.en_colonia.short': 'A la colònia',
    'cer.en_acogida.label': 'En acollida',
    'cer.en_acogida.short': 'Acollida',
    'cer.adoptado.label': 'Adoptat',
    'cer.adoptado.short': 'Adoptat',
    'cer.fallecido.label': 'Mort',
    'cer.fallecido.short': '✝',

    // Tipus d’esdeveniment veterinari
    'event.esterilizacion.label': 'Esterilització',
    'event.vacunacion.label': 'Vacunació',
    'event.desparasitacion.label': 'Desparasitació',
    'event.consulta.label': 'Consulta vet.',
    'event.tratamiento.label': 'Tractament',

    // Tasques de torn
    'task.alimentacion.label': 'Alimentació',
    'task.alimentacion.short': 'Menjar',
    'task.agua_limpieza.label': 'Aigua i neteja',
    'task.agua_limpieza.short': 'Neteja',
    'task.observacion.label': 'Observació',
    'task.observacion.short': 'Control',
    'task.medicacion.label': 'Medicació',
    'task.medicacion.short': 'Medic.',
    'task.otros.label': 'Altres',
    'task.otros.short': 'Altres',

    // Franges de torn
    'slot.morning.label': 'Matí',
    'slot.morning.short': 'Matí',
    'slot.afternoon.label': 'Tarda',
    'slot.afternoon.short': 'Tarda',

    // Dies de la setmana (clau per número 0..6, diumenge=0)
    'day.0.label': 'Diumenge', 'day.0.short': 'dg',
    'day.1.label': 'Dilluns',  'day.1.short': 'dl',
    'day.2.label': 'Dimarts',  'day.2.short': 'dt',
    'day.3.label': 'Dimecres', 'day.3.short': 'dc',
    'day.4.label': 'Dijous',   'day.4.short': 'dj',
    'day.5.label': 'Divendres','day.5.short': 'dv',
    'day.6.label': 'Dissabte', 'day.6.short': 'ds',

    // Sexe
    'sex.H': 'Femella',
    'sex.M': 'Mascle',
    'sex.D': 'Desconegut',

    // ─── Calendari ───
    'cal.title': 'Calendari',
    'cal.subtitle': 'Torns de voluntariat i cura de les colònies.',
    'cal.newTemplate': 'Nova plantilla',
    'cal.tab.month': 'Mes',
    'cal.tab.week': 'Setmana',
    'cal.tab.mine': 'Els meus torns',
    'cal.tab.templates': 'Plantilles',
    'cal.allColonies': 'Totes les colònies',
    'cal.allTasks': 'Totes les tasques',
    'cal.today': 'Avui',
    'cal.thisWeek': 'Aquesta setmana',
    'cal.weekOf': 'Setmana del {range}',
    'cal.uncoveredTooltip': '{n} sense cobrir',
    'cal.moreCount': '+ {n} més',
    'cal.legend': 'Llegenda',
    'cal.uncovered': 'Sense cobrir',
    'cal.todayBadge': 'avui',
    'cal.noShiftsScheduled': 'Sense torns programats',
    'cal.dayNoShifts': 'Cap torn programat aquest dia.',
    'cal.chipFree': 'Lliure',
    'cal.row.done': 'Fet',

    'cal.detail.date': 'Data',
    'cal.detail.slot': 'Franja',
    'cal.detail.completed': 'Completat',
    'cal.detail.by': 'Per',
    'cal.detail.instructions': 'Instruccions',
    'cal.detail.assignedTo': 'Assignat a',
    'cal.detail.openTitle': 'Torn lliure',
    'cal.detail.claim': 'Apunta\'m a aquest torn',
    'cal.detail.assignOther': 'Assigna a una altra persona',
    'cal.detail.reassign': 'Reassigna',
    'cal.detail.markDone': 'Marca com a fet',
    'cal.detail.leaveFree': 'Deixa el torn lliure',
    'cal.detail.unassign': 'Desassigna',
    'cal.detail.undoComplete': 'Desfés completat',
    'cal.detail.editTemplate': 'Edita la plantilla recurrent',

    'cal.assign.to': 'Assigna a',
    'cal.assign.btn': 'Assigna',

    'cal.tpl.colony': 'Colònia',
    'cal.tpl.task': 'Tasca',
    'cal.tpl.daysOfWeek': 'Dies de la setmana',
    'cal.tpl.slot': 'Franja del dia',
    'cal.tpl.notes': 'Observacions',
    'cal.tpl.notesPlaceholder': 'Instruccions per als voluntaris…',
    'cal.tpl.activeLabel': 'Plantilla activa (genera torns)',
    'cal.tpl.delete': 'Elimina',
    'cal.tpl.save': 'Desa els canvis',
    'cal.tpl.create': 'Crea la plantilla',
    'cal.tpl.preset.all': 'Tots els dies',
    'cal.tpl.preset.weekdays': 'Dl-Dv',
    'cal.tpl.preset.weekend': 'Cap de setmana',
    'cal.tpl.preset.mwf': 'Dl-Dc-Dv',
    'cal.tpl.allDaysShort': 'Tots els dies',
    'cal.tpl.inactive': 'inactiva',
    'cal.tpl.empty': 'Sense plantilles de torns',
    'cal.tpl.emptyDesc': 'Crea una plantilla per definir torns recurrents en una colònia.',
    'cal.tpl.createFirst': 'Crea la primera plantilla',
    'cal.tpl.countOne': 'plantilla',
    'cal.tpl.countMany': 'plantilles',

    'cal.mine.upcoming': 'Els meus pròxims torns',
    'cal.mine.empty': 'No tens torns assignats',
    'cal.mine.emptyClaim': 'Apunta\'t a un torn lliure més avall.',
    'cal.mine.emptyWait': 'Espera que un coordinador te n\'assigni un.',
    'cal.mine.openShifts': 'Torns lliures',
    'cal.mine.recentDone': 'Últims completats',

    // ─── Plataforma (vista super_admin) ───
    'platform.kicker': 'Superadministració',
    'platform.title': 'Plataforma',
    'platform.subtitle': 'Gestió global de totes les organitzacions donades d\'alta a la plataforma. Des d\'aquí pots crear, suspendre, eliminar o auditar qualsevol organització.',
    'platform.newOrg': 'Nova organització',
    'platform.logout': 'Surt',
    'platform.stat.orgs': 'Organitzacions',
    'platform.stat.orgsAllActive': 'totes actives',
    'platform.stat.orgsSuspended': '{n} suspeses',
    'platform.stat.users': 'Usuaris',
    'platform.stat.usersSuper': '{n} super admin',
    'platform.stat.colonies': 'Colònies',
    'platform.stat.totalCats': 'Gats totals',
    'platform.tab.orgs': 'Organitzacions ({n})',
    'platform.tab.users': 'Usuaris ({n})',
    'platform.orgs.empty': 'Sense organitzacions',
    'platform.orgs.emptyDesc': 'Crea la primera organització per començar.',
    'platform.orgs.searchPh': 'Cerca per nom, ciutat o correu…',
    'platform.orgs.clearTitle': 'Esborra',
    'platform.orgs.countOne': '{n} organització',
    'platform.orgs.countMany': '{n} organitzacions',
    'platform.orgs.countOf': '{n} de {total}',
    'platform.orgs.noResults': 'Cap organització coincideix amb "{q}".',
    'platform.users.searchPh': 'Cerca per nom o correu…',
    'platform.users.allOrgs': 'Totes les organitzacions',
    'platform.users.onlySuper': 'Només superadministradors',
    'platform.users.filterByOrg': 'Filtra per organització',
    'platform.users.countOne': '{n} usuari',
    'platform.users.countMany': '{n} usuaris',
    'platform.users.noResults': 'Cap usuari coincideix amb els filtres actuals.',
    'platform.userRow.superAdmin': 'Super administrador',
    'platform.userRow.orgsOne': '{n} organització',
    'platform.userRow.orgsMany': '{n} organitzacions',
    'platform.userRow.resetPwd': 'Restableix la contrasenya',
    'platform.userRow.removeSuper': 'Treu super admin',
    'platform.userRow.makeSuper': 'Fes super admin',
    'platform.orgRow.suspended': 'Suspesa',
    'platform.orgRow.noCity': 'Sense ciutat',
    'platform.orgRow.members': 'Membres',
    'platform.orgRow.noAdmin': '⚠ sense admin',
    'platform.orgRow.adminCount': '{n} admin',
    'platform.orgRow.colonies': 'Colònies',
    'platform.orgRow.cats': 'Gats',
    'platform.orgRow.created': 'Creada',
    'platform.orgRow.enter': 'Entra',
    'platform.orgRow.editInfo': 'Edita la informació',
    'platform.orgRow.reactivate': 'Reactiva',
    'platform.orgRow.suspend': 'Suspèn',
    'platform.orgRow.delete': 'Elimina permanentment',

    // ─── Títols dels modals globals ───
    'modal.title.addColony': 'Nova colònia',
    'modal.title.editColony': 'Edita la colònia',
    'modal.title.addCat': 'Nou gat',
    'modal.title.editCat': 'Edita el gat',
    'modal.title.addEvent': 'Nou esdeveniment veterinari',
    'modal.title.addReminder': 'Nou recordatori',
    'modal.title.editReminder': 'Edita el recordatori',
    'modal.title.createOrg': 'Nova organització',
    'modal.title.editOrg': 'Edita l\'organització',
    'modal.title.platformCreateOrg': 'Crea una organització des de la plataforma',
    'modal.title.changeMyPassword': 'Canvia la contrasenya',
    'modal.title.resetPassword': 'Restableix la contrasenya',
    'modal.title.addTemplate': 'Nova plantilla de torn',
    'modal.title.editTemplate': 'Edita la plantilla de torn',
    'modal.title.viewShift': 'Detall del torn',
    'modal.title.assignShift': 'Assigna torn',

    // ─── Vista Colònies (llista i detall) ───
    'col.kicker': 'Gestió',
    'col.title': 'Colònies',
    'col.newColony': 'Nova colònia',
    'col.searchPh': 'Cerca per nom o adreça…',
    'col.empty': 'No hi ha colònies',
    'col.emptyDesc': 'Comença afegint la primera colònia que gestiona la teva organització.',
    'col.createColony': 'Crea la colònia',
    'col.cardCats': 'Gats',
    'col.cardCer': 'CER',
    'col.detail.kicker': 'Colònia',
    'col.detail.statsCats': 'Gats fitxats',
    'col.detail.statsSterilized': 'Esterilitzats',
    'col.detail.statsCarers': 'Cuidadors',
    'col.detail.notesLabel': 'Notes',
    'col.detail.catsTitle': 'Gats d\'aquesta colònia',
    'col.detail.addCat': 'Afegeix un gat',
    'col.detail.emptyCats': 'Cap gat fitxat',
    'col.detail.emptyCatsDesc': 'Afegeix els gats que viuen en aquesta colònia per començar-ne el seguiment.',
    'col.detail.addFirstCat': 'Afegeix el primer gat',
    'col.form.nameLabel': 'Nom de la colònia *',
    'col.form.namePh': 'Plaça del Pi, Parc Nord…',
    'col.form.addressLabel': 'Adreça / zona',
    'col.form.addressPh': 'Barri Gòtic, Barcelona',
    'col.form.carersLabel': 'Cuidadors assignats',
    'col.form.carersPh': 'Marta, Jordi…',
    'col.form.coordsLabel': 'Coordenades (opcional, per al mapa)',
    'col.form.latPh': 'Latitud (41.382)',
    'col.form.lngPh': 'Longitud (2.174)',
    'col.form.fromMapNote': 'Coordenades preses del mapa. Pots ajustar-les si cal.',
    'col.form.coordsHint': 'També pots deixar-les buides i afegir-les més tard tocant el mapa.',
    'col.form.notesLabel': 'Notes sobre la colònia',
    'col.form.notesPh': 'Accés, horaris, acords amb l\'ajuntament…',

    // ─── Vista Gats (llista) ───
    'cats.kicker': 'Cens',
    'cats.title': 'Gats',
    'cats.newCat': 'Nou gat',
    'cats.searchPh': 'Cerca per nom o color…',
    'cats.filterAll': 'Tots',
    'cats.emptyResults': 'Sense resultats',
    'cats.emptyResultsInColony': 'No hi ha gats a "{name}" que coincideixin amb els filtres.',
    'cats.emptyResultsGeneric': 'No hi ha gats que coincideixin amb aquesta cerca o filtre.',

    // ─── Detall de gat ───
    'catDetail.editCardBtn': 'Edita la fitxa',
    'catDetail.kicker': 'Fitxa individual',
    'catDetail.field.colony': 'Colònia',
    'catDetail.field.age': 'Edat estimada',
    'catDetail.field.color': 'Color / pelatge',
    'catDetail.field.microchip': 'Microxip',
    'catDetail.field.signs': 'Senyals identificatius',
    'catDetail.notesLabel': 'Notes',
    'catDetail.reminders': 'Recordatoris',
    'catDetail.addReminder': 'Afegeix un recordatori',
    'catDetail.emptyReminders': 'No hi ha recordatoris per a aquest gat. Afegeix-ne un perquè no se t\'escapi la pròxima vacuna o desparasitació.',
    'catDetail.rem.markDone': 'Marca com a fet',
    'catDetail.rem.showCompleted': 'Veure completats ({n})',
    'catDetail.rem.hideCompleted': 'Amaga completats ({n})',
    'catDetail.rem.completedBy': 'Fet {date} per {name}',
    'catDetail.rem.completedNoBy': 'Fet {date}',
    'catDetail.rem.undo': 'Desfés',
    'catDetail.history': 'Historial veterinari',
    'catDetail.addEvent': 'Afegeix esdeveniment',
    'catDetail.emptyEvents': 'Sense esdeveniments registrats',
    'catDetail.emptyEventsDesc': 'Registra esterilitzacions, vacunacions, consultes i tractaments per tenir un historial complet.',
    'catDetail.firstEvent': 'Primer esdeveniment',
    'catDetail.eventFallback': 'Esdeveniment',
    'catDetail.otherType': 'Altre',

    // ─── Formulari de gat ───
    'catForm.photoTooBig.title': 'Foto massa gran',
    'catForm.photoTooBig.msg': 'La imatge supera els 10 MB. Prova amb una de més lleugera.',
    'catForm.changePhoto': 'Canvia la foto',
    'catForm.addPhoto': 'Afegeix foto',
    'catForm.removePhoto': 'Treu la foto',
    'catForm.nameLabel': 'Nom *',
    'catForm.namePh': 'Figa, Pelut, Nit…',
    'catForm.sexLabel': 'Sexe',
    'catForm.ageLabel': 'Edat aprox.',
    'catForm.agePh': '2 anys',
    'catForm.colonyLabel': 'Colònia *',
    'catForm.cerLabel': 'Estat CER',
    'catForm.colorLabel': 'Color / pelatge',
    'catForm.colorPh': 'Atigrat marró, negre de pèl llarg…',
    'catForm.signsLabel': 'Senyals identificatius',
    'catForm.signsPh': 'Orella retallada, cicatriu, heterocromia…',
    'catForm.microchipLabel': 'Microxip (si en té)',
    'catForm.notesLabel': 'Notes',
    'catForm.notesPh': 'Caràcter, observacions, alimentació…',

    // ─── Formulari d\'esdeveniment veterinari ───
    'eventForm.typeLabel': 'Tipus d\'esdeveniment',
    'eventForm.dateLabel': 'Data',
    'eventForm.costLabel': 'Cost (€)',
    'eventForm.vetLabel': 'Veterinari / centre',
    'eventForm.vetPh': 'Clínica Veterinària…',
    'eventForm.notesLabel': 'Observacions',
    'eventForm.notesPh': 'Detalls del procediment…',

    // ─── Formulari de recordatori ───
    'reminderForm.typeLabel': 'Tipus',
    'reminderForm.dueDateLabel': 'Data prevista *',
    'reminderForm.titleLabel': 'Títol',
    'reminderForm.titlePh': 'Ex.: Vacuna trivalent anual',
    'reminderForm.notesLabel': 'Notes',
    'reminderForm.notesPh': 'Indicacions, dosi, anotacions…',
    'reminderForm.saving': 'Desant…',
    'reminderForm.save': 'Desa el recordatori',

    'login.brandTag': 'gestió CER',
    'login.welcome': 'Benvingut/da',
    'login.welcomeEm': 'de nou',
    'login.subtitle': 'Introdueix les teves credencials per accedir a la plataforma.',
    'login.password': 'Contrasenya',
    'login.enter': 'Entra',
    'login.entering': 'Entrant…',
    'login.forgot': 'He oblidat la contrasenya?',

    'forgot.title': 'Recuperar la contrasenya',
    'forgot.intro': 'Introdueix el correu del teu compte. T’enviarem un enllaç per crear una contrasenya nova.',
    'forgot.invalidEmail': 'Introdueix un correu vàlid.',
    'forgot.send': 'Envia l’enllaç',
    'forgot.sending': 'Enviant…',
    'forgot.sentTitle': 'Correu enviat',
    'forgot.sentBody': 'Si {email} té un compte a Felina, rebràs un correu amb instruccions per crear una contrasenya nova. Els primers cops pot trigar uns minuts i, si no arriba, mira la carpeta de correu brossa.',
    'forgot.back': 'Torna a l’inici de sessió',

    'dash.kicker': 'Tauler',
    'dash.title': 'Resum',
    'dash.titleEm': 'general',
    'dash.subtitle': 'Estat actual de les colònies, gats fitxats i últimes intervencions registrades.',
    'dash.stat.colonies': 'Colònies',
    'dash.stat.coloniesSub': 'actives',
    'dash.stat.cats': 'Gats',
    'dash.stat.catsSub': 'fitxats a l’app',
    'dash.stat.sterilized': 'Esterilitzats',
    'dash.stat.sterilizedSub': '{n} de {total}',
    'dash.stat.toCapture': 'Per capturar',
    'dash.stat.toCaptureAtt': 'requereixen atenció',
    'dash.stat.toCaptureOk': 'al dia',
    'dash.shifts.uncoveredOne': '{n} torn sense cobrir aquesta setmana',
    'dash.shifts.uncoveredMany': '{n} torns sense cobrir aquesta setmana',
    'dash.shifts.wellOrganized': 'Setmana ben organitzada',
    'dash.shifts.uncoveredDesc': 'Hi ha torns programats que han quedat sense assignar. Revisa el calendari.',
    'dash.shifts.upcomingDescOne': '{n} pròxim torn programat en els pròxims 7 dies.',
    'dash.shifts.upcomingDescMany': '{n} pròxims torns programats en els pròxims 7 dies.',
    'dash.shifts.goCalendar': 'Ves al calendari',
    'dash.shifts.free': 'lliure',
    'dash.reminders.overdueOne': '{n} recordatori vençut',
    'dash.reminders.overdueMany': '{n} recordatoris vençuts',
    'dash.reminders.upcomingTitle': 'Recordatoris pròxims',
    'dash.reminders.overdueDesc': 'Hi ha revisions mèdiques que s’han passat de data. Revisa els gats afectats.',
    'dash.reminders.upcomingDescOne': '{n} pendent en els pròxims 30 dies.',
    'dash.reminders.upcomingDescMany': '{n} pendents en els pròxims 30 dies.',
    'dash.reminders.overdue': 'Vençut',
    'dash.reminders.today': 'Avui',
    'dash.events.title': 'Últimes intervencions',
    'dash.events.seeHistory': 'Veure historial',
    'dash.events.empty': 'Encara no hi ha intervencions registrades.',
    'dash.catDeleted': 'Gat eliminat',
    'dash.colonies.title': 'Colònies',
    'dash.colonies.catCountOne': '{n} gat',
    'dash.colonies.catCountMany': '{n} gats',
  },
};

const interpolate = (str, vars) =>
  vars ? str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`)) : str;

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT + PROVIDER + HOOK
// ─────────────────────────────────────────────────────────────────────────────
const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const initial = detectInitialLang();
    setDateLocale(initial);
    return initial;
  });

  const setLang = useCallback((next) => {
    if (next !== 'ca' && next !== 'es') return;
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
    setDateLocale(next);
    setLangState(next);
  }, []);

  const t = useCallback((key, vars) => {
    const table = dict[lang] || dict.es;
    const raw = table[key] ?? dict.es[key] ?? key;
    return interpolate(raw, vars);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook resiliente: si por lo que sea se usa fuera del provider, devuelve un
// t() funcional en castellano para no romper el render.
export const useTranslation = () => {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    lang: 'es',
    setLang: () => {},
    t: (key, vars) => interpolate(dict.es[key] ?? key, vars),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR DE IDIOMA (control segmentado compacto CA | ES)
// ─────────────────────────────────────────────────────────────────────────────
export const LanguageSwitcher = ({ size = 'md' }) => {
  const { lang, setLang } = useTranslation();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <div className="inline-flex rounded-lg overflow-hidden" style={{ boxShadow: '0 0 0 1px #EADFC9' }}>
      {LANGS.map((l) => {
        const active = lang === l;
        return (
          <button key={l} type="button" onClick={() => setLang(l)}
                  className={`${pad} font-medium transition-colors`}
                  style={{
                    backgroundColor: active ? '#1F3A2F' : '#FDFAF3',
                    color: active ? '#F8F3E8' : '#8A7A5C',
                  }}>
            {l === 'ca' ? 'CA' : 'ES'}
          </button>
        );
      })}
    </div>
  );
};
