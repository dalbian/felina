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
    'nav.stats': 'Estadísticas',
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
    'modal.title.editEvent': 'Editar evento veterinario',
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
    'col.detail.tabCats': 'Gatos',
    'col.detail.tabStats': 'Estadísticas',
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
    'catDetail.field.age': 'Edad',
    'catDetail.ageYearOne': '1 año',
    'catDetail.ageYears': '{n} años',
    'catDetail.ageMonthOne': '1 mes',
    'catDetail.ageMonths': '{n} meses',
    'catDetail.ageNewborn': 'Recién nacido',
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
    'catForm.birthLabel': 'Nacimiento aprox.',
    'catForm.birthHint': 'Solo mes y año. La edad se calculará sola.',
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
    'reminderForm.errPastDate': 'No se puede elegir una fecha pasada.',

    // ─── Confirm/Notify por defecto (ConfirmDialog en ui.jsx) ───
    'confirm.accept': 'Aceptar',

    // ─── Pantalla SetPasswordScreen ───
    'setPwd.activateTitle': 'Activa tu',
    'setPwd.activateTitleEm': 'cuenta',
    'setPwd.recoveryTitle': 'Define tu',
    'setPwd.recoveryTitleEm': 'nueva contraseña',
    'setPwd.inviteIntro': 'Te han invitado. Para empezar a usar Felina, define una contraseña para tu cuenta.',
    'setPwd.inviteIntroOrg': 'Te han invitado a {org}. Para empezar a usar Felina, define una contraseña para tu cuenta.',
    'setPwd.recoveryIntro': 'Introduce una contraseña nueva para volver a entrar en Felina.',
    'setPwd.newPwdLabel': 'Contraseña nueva *',
    'setPwd.newPwdHint': '(mín. {min})',
    'setPwd.confirmLabel': 'Confirmar contraseña *',
    'setPwd.saving': 'Guardando…',
    'setPwd.submitInvite': 'Activar cuenta y entrar',
    'setPwd.submitRecovery': 'Guardar y entrar',
    'setPwd.cancelLogout': 'Cancelar y cerrar sesión',

    // ─── ChangePasswordForm (cambiar mi contraseña) ───
    'changePwd.intro': 'Tu nueva contraseña reemplazará la actual la próxima vez que inicies sesión.',
    'changePwd.currentLabel': 'Contraseña actual *',
    'changePwd.newLabel': 'Nueva contraseña *',
    'changePwd.newHint': '(mín. {min})',
    'changePwd.confirmLabel': 'Confirmar nueva contraseña *',
    'changePwd.errMissingCurrent': 'Introduce tu contraseña actual.',
    'changePwd.errSamePwd': 'La nueva contraseña debe ser distinta de la actual.',
    'changePwd.saving': 'Guardando…',
    'changePwd.submit': 'Actualizar contraseña',

    // ─── ResetPasswordForm (admin restablece a otra persona) ───
    'resetPwd.intro': 'Vas a establecer una nueva contraseña para {name}. Compártesela de forma segura; podrá cambiarla al iniciar sesión.',
    'resetPwd.newLabel': 'Nueva contraseña *',
    'resetPwd.newHint': '(mín. {min})',
    'resetPwd.confirmLabel': 'Confirmar contraseña *',
    'resetPwd.saving': 'Guardando…',
    'resetPwd.submit': 'Restablecer contraseña',

    // ─── RgpdGate (aviso legal primer login) ───
    'rgpd.welcome': 'Bienvenido/a',
    'rgpd.welcomeName': 'Bienvenido/a, {name}',
    'rgpd.intro': 'Antes de empezar, dos cosas que conviene tener claras:',
    'rgpd.dataTitle': 'Tus datos están a salvo.',
    'rgpd.dataBody': 'Se guardan en un servidor europeo (Frankfurt/Dublín) en cumplimiento del RGPD. Solo las personas que tu organización autorice pueden verlos.',
    'rgpd.activityTitle': 'Tus acciones quedan registradas.',
    'rgpd.activityBody': 'La administración de tu organización puede ver quién hace cada cambio (añadir gatos, completar turnos, etc.) durante 90 días. Después se borra automáticamente.',
    'rgpd.betaTitle': 'Es una versión inicial.',
    'rgpd.betaBody': 'Si algo se ve raro o se atasca, avísanos — el feedback es lo que la hará mejor.',
    'rgpd.accept': 'Entendido, empezar a usar Felina',

    // ─── Bloque demo del LoginScreen ───
    'login.demo.toggle': '¿Probando el prototipo? Ver credenciales de demostración',
    'login.demo.commonPwd': 'Contraseña común:',
    'login.demo.aina': 'Superadmin',
    'login.demo.marta': 'Admin de org',
    'login.demo.jordi': 'Coordinador',
    'login.demo.laia': 'Voluntaria',
    'login.demo.pvila': 'Veterinario',
    'login.demo.anna': 'Admin 2ª org',

    // ─── Vista Ajustes (settings) ───
    'settings.kicker': 'Configuración',
    'settings.title': 'Ajustes',
    'settings.org.kicker': 'Organización',
    'settings.org.noCity': 'Sin ciudad',
    'settings.members.title': 'Miembros del equipo',
    'settings.members.countOne': '{n} persona',
    'settings.members.countMany': '{n} personas',
    'settings.members.invite': 'Invitar miembro',
    'settings.roles.title': 'Roles y permisos',
    'settings.session.kicker': 'Sesión',
    'settings.session.changePwd': 'Cambiar contraseña',
    'settings.session.logout': 'Cerrar sesión',
    'settings.session.leaveOrg': 'Salir de esta organización',
    'settings.danger.kicker': 'Zona peligrosa',
    'settings.danger.body': 'Eliminar la organización borra todas sus colonias, gatos, eventos y miembros. Esta acción no se puede deshacer.',
    'settings.danger.delete': 'Eliminar organización permanentemente',
    'settings.demo.kicker': 'Modo de pruebas',
    'settings.demo.body': 'Restablece la aplicación a su estado inicial con los datos de demostración. Útil si quieres empezar de cero o si algo se ha roto en tus pruebas. Solo afecta a este dispositivo — no toca los datos de otras personas que estén probando Felina.',
    'settings.demo.reset': 'Reiniciar datos de este navegador',

    // ─── Registro de actividad (solo admin / super_admin) ───
    'settings.activity.title': 'Registro de actividad',
    'settings.activity.subtitle': 'Cambios de los últimos 90 días en esta organización. Después se borran automáticamente.',
    'settings.activity.filterType': 'Tipo',
    'settings.activity.filterUser': 'Persona',
    'settings.activity.filterAll': 'Todos',
    'settings.activity.entityCat': 'Gatos',
    'settings.activity.entityColony': 'Colonias',
    'settings.activity.entityEvent': 'Intervenciones',
    'settings.activity.entityReminder': 'Recordatorios',
    'settings.activity.entityShift': 'Turnos',
    'settings.activity.entityMember': 'Miembros',
    'settings.activity.entityOrg': 'Organización',
    'settings.activity.empty': 'Aún no hay actividad registrada.',
    'settings.activity.emptyFiltered': 'No hay entradas con esos filtros.',
    'settings.activity.showMore': 'Mostrar más',

    // Tarjeta resumen en Ajustes (lleva a la vista propia)
    'settings.activityCard.title': 'Registro de actividad',
    'settings.activityCard.empty': 'Aún no hay actividad registrada',
    'settings.activityCard.countOne': '{n} entrada en los últimos 90 días',
    'settings.activityCard.countMany': '{n} entradas en los últimos 90 días',

    // Vista propia del registro
    'activity.view.back': 'Volver a Ajustes',
    'activity.view.kicker': 'Auditoría',
    'activity.view.title': 'Registro de',
    'activity.view.titleEm': 'actividad',
    'activity.view.subtitle': 'Cambios de los últimos 90 días en esta organización. Las entradas más antiguas se borran automáticamente.',
    'activity.view.showing': 'Mostrando {visible} de {total} entradas',

    // Grupos temporales del timeline
    'activity.group.today': 'Hoy',
    'activity.group.yesterday': 'Ayer',
    'activity.group.thisWeek': 'Esta semana',
    'activity.group.older': 'Más antiguo',

    // Plantillas de mensaje para cada tipo de acción. Las variables {userName}
    // y {entityName} se interpolan desde la entrada del log.
    'activity.action.cat_added': '{userName} añadió el gato {entityName}',
    'activity.action.cat_updated': '{userName} editó la ficha de {entityName}',
    'activity.action.cat_status_changed': '{userName} cambió el estado CER de {entityName}',
    'activity.action.cat_deleted': '{userName} eliminó el gato {entityName}',
    'activity.action.colony_added': '{userName} creó la colonia {entityName}',
    'activity.action.colony_updated': '{userName} editó la colonia {entityName}',
    'activity.action.colony_deleted': '{userName} eliminó la colonia {entityName}',
    'activity.action.event_added': '{userName} registró una intervención veterinaria en {entityName}',
    'activity.action.event_updated': '{userName} editó una intervención de {entityName}',
    'activity.action.reminder_added': '{userName} programó un recordatorio para {entityName}',
    'activity.action.reminder_completed': '{userName} marcó como hecho un recordatorio de {entityName}',
    'activity.action.shift_assigned': '{userName} asignó un turno en {entityName}',
    'activity.action.shift_completed': '{userName} completó un turno en {entityName}',
    'activity.action.member_invited': '{userName} invitó a {entityName}',
    'activity.action.member_removed': '{userName} expulsó a {entityName}',
    'activity.action.member_role_changed': '{userName} cambió el rol de {entityName}',
    'activity.action.org_updated': '{userName} editó datos de la organización',

    // ─── MemberRow (fila de miembro en ajustes) ───
    'memberRow.you': 'tú',
    'memberRow.changeRole': 'Cambiar rol',
    'memberRow.resetPwd': 'Restablecer contraseña…',
    'memberRow.expel': 'Expulsar del equipo',

    // ─── Modal: Invitar miembro ───
    'invite.modalTitle': 'Invitar miembro',
    'invite.body': 'Si la persona ya tiene cuenta en Felina, la añadimos directamente como miembro. Si no, recibirá un email con un enlace para activar su cuenta (puede tardar unos minutos en llegar y, las primeras veces, puede caer en spam).',
    'invite.emailLabel': 'Email de la persona *',
    'invite.emailPh': 'persona@ejemplo.org',
    'invite.invalidEmail': 'Introduce un email válido.',
    'invite.roleLabel': 'Rol en la organización',
    'invite.adding': 'Añadiendo…',
    'invite.submit': 'Añadir al equipo',

    // ─── OrgForm (crear/editar organización) ───
    'orgForm.nameLabel': 'Nombre de la organización *',
    'orgForm.namePh': 'Associació Gats del Barri',
    'orgForm.cityLabel': 'Ciudad / municipio',
    'orgForm.cityPh': 'Barcelona',
    'orgForm.emailLabel': 'Email de contacto',
    'orgForm.emailPh': 'info@ejemplo.org',

    // ─── App.jsx: pantallas de estado y notify() ───
    'app.noOrg.title': 'Hola',
    'app.noOrg.titleName': 'Hola, {name}',
    'app.noOrg.line1': 'Tu cuenta existe, pero todavía no perteneces a ninguna organización.',
    'app.noOrg.line2': 'Pídele a la administración de tu protectora que te asigne acceso usando este email:',
    'app.noOrg.logout': 'Cerrar sesión',

    'app.suspended.title': 'Organización suspendida',
    'app.suspended.body': '{org} está suspendida temporalmente. Contacta con la administración de la plataforma para reactivarla.',
    'app.suspended.others': 'Otras organizaciones',
    'app.suspended.logout': 'Cerrar sesión',

    'app.notify.noPermTitle': 'Sin permiso',
    'app.notify.noPermColony': 'Tu rol actual no permite añadir colonias.',
    'app.notify.noPermCat': 'Tu rol actual no permite añadir fichas de gato.',
    'app.notify.noPermGeneric': 'Tu rol actual no permite esta acción.',
    'app.notify.noPermReminder': 'Tu rol actual no permite gestionar recordatorios.',
    'app.notify.noPermShifts': 'Solo administración o coordinación puede gestionar plantillas de turnos.',
    'app.notify.resetPwdTitle': 'Restablecer contraseña',
    'app.notify.resetPwdBody': '{name} debe pulsar "He olvidado mi contraseña" en la pantalla de login para recibir un email de recuperación. Si necesitas hacerlo manualmente, contacta con la administración de la plataforma.',

    // ─── Mensajes del store (useFelinaStore.js): notify/confirm ───
    // Permisos genéricos
    'store.noPerm.title': 'Sin permiso',
    'store.noPerm.body': 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.',
    'store.noPerm.bodyShort': 'Tu rol actual no permite esta acción.',
    'store.noPerm.deleteColony': 'Solo administración o coordinación pueden eliminar colonias.',
    'store.noPerm.deleteCat': 'Solo administración o coordinación pueden eliminar fichas de gato.',
    'store.noPerm.reminder': 'Tu rol actual no permite gestionar recordatorios.',
    'store.noPerm.deleteReminder': 'Solo administración o coordinación puede eliminar recordatorios.',

    // Errores de validación de pertenencia a org
    'store.invalidOp.title': 'Operación no válida',
    'store.invalidOp.colonyOrg': 'Esta colonia no pertenece a la organización activa.',
    'store.invalidOp.catOrg': 'Este gato no pertenece a la organización activa.',
    'store.invalidOp.reminderOrg': 'Este recordatorio no pertenece a la organización activa.',
    'store.invalidOp.eventOrg': 'Este evento no pertenece a la organización activa.',
    'store.invalidOp.templateOrg': 'Esta plantilla no pertenece a la organización activa.',
    'store.invalidOp.shiftOrg': 'Este turno no pertenece a la organización activa.',
    'store.invalidOp.missingCat': 'Falta el gato asociado al recordatorio.',

    // Errores genéricos de save/delete
    'store.err.saveFail': 'No se pudo guardar',
    'store.err.deleteFail': 'No se pudo eliminar',
    'store.err.changeFail': 'No se pudo cambiar',
    'store.err.changeStatusFail': 'No se pudo cambiar el estado',
    'store.err.changeRoleFail': 'No se pudo cambiar el rol',
    'store.err.expelFail': 'No se pudo expulsar',
    'store.err.leaveFail': 'No se pudo salir',

    // Crear/editar organización (no plataforma)
    'store.createOrg.errTitle': 'No se pudo crear la organización',
    'store.createOrg.errRls': 'Solo la administración de la plataforma puede crear nuevas organizaciones. Pídesela a un superadministrador.',
    'store.createOrg.partialTitle': 'Org creada, pero…',
    'store.createOrg.partialBody': 'No se pudo asignar tu rol de admin: {message}',

    // Invitar miembro
    'store.invite.sentTitle': 'Invitación enviada',
    'store.invite.sentBody': 'Hemos enviado un email a {email} con el enlace de activación. Aparecerá como miembro cuando lo abra y defina su contraseña. Las primeras invitaciones pueden tardar unos minutos y, si no llega, conviene mirar la carpeta de spam.',
    'store.invite.errNoPerm': 'No tienes permisos para añadir miembros.',
    'store.invite.errBadEmail': 'Email no válido.',
    'store.invite.errGeneric': 'No se pudo invitar.',

    // Cambiar mi contraseña
    'store.changeMyPwd.errNoSession': 'No hay sesión activa.',
    'store.changeMyPwd.errWrongCurrent': 'La contraseña actual no es correcta.',
    'store.changeMyPwd.errUpdate': 'No se pudo cambiar la contraseña: {message}',
    'store.setPwd.errSet': 'No se pudo establecer la contraseña: {message}',

    // Reset contraseña (otra persona)
    'store.resetOtherPwd.errNotFound': 'Usuario no encontrado.',
    'store.resetOtherPwd.errSelf': 'Usa "Cambiar contraseña" para tu propia cuenta.',
    'store.resetOtherPwd.errUnavailable': 'Resetear la contraseña de otra persona aún no está disponible desde la app. Pídele que use el botón "He olvidado mi contraseña" en la pantalla de login (próximamente), o contacta con la administración de la plataforma para hacerlo manualmente.',

    // Expulsar miembro
    'store.expel.title': 'Expulsar miembro',
    'store.expel.bodyName': 'Vas a expulsar a {name} de la organización. Perderá el acceso pero su histórico se conserva.',
    'store.expel.bodyAnon': 'Vas a expulsar a este miembro de la organización. Perderá el acceso pero su histórico se conserva.',
    'store.expel.confirm': 'Expulsar',

    // Salir de la organización
    'store.leaveOrg.title': 'Salir de la organización',
    'store.leaveOrg.body': 'Dejarás de tener acceso a las colonias, gatos y turnos de esta organización. La administración tendrá que volver a invitarte si quieres entrar de nuevo.',
    'store.leaveOrg.confirm': 'Sí, salir',

    // Eliminar organización (admin de org)
    'store.deleteOrg.title': 'Eliminar "{name}"',
    'store.deleteOrg.bodyOne': 'Se borrarán definitivamente {cols} colonia, {cats} gato y {mems} miembro, junto con todo su historial veterinario. Esta acción no se puede deshacer.',
    'store.deleteOrg.bodyMany': 'Se borrarán definitivamente {cols} colonias, {cats} gatos y {mems} miembros, junto con todo su historial veterinario. Esta acción no se puede deshacer.',
    'store.deleteOrg.confirm': 'Eliminar definitivamente',

    // Reiniciar datos (modo demo)
    'store.resetData.title': 'Reiniciar datos de prueba',
    'store.resetData.body': 'Se perderán todas las organizaciones, colonias, gatos, eventos y turnos guardados en este navegador. Solo afecta a este dispositivo y no se puede deshacer.',
    'store.resetData.confirm': 'Sí, reiniciar todo',

    // Plataforma: eliminar org
    'store.platDeleteOrg.title': 'Eliminar "{name}"',
    'store.platDeleteOrg.body': 'Como superadministración, vas a borrar esta organización con {mems} miembro(s), {cols} colonia(s) y {cats} gato(s). La acción es irreversible.',
    'store.platDeleteOrg.confirm': 'Eliminar definitivamente',

    // Plataforma: suspender org
    'store.platSuspendOrg.title': 'Suspender "{name}"',
    'store.platSuspendOrg.body': 'Mientras esté suspendida, sus miembros no podrán acceder a sus datos. Podrás reactivarla en cualquier momento sin perder nada.',
    'store.platSuspendOrg.confirm': 'Suspender',

    // Toggle superadmin
    'store.toggleSuper.onlyOneTitle': 'Es el único superadministrador',
    'store.toggleSuper.onlyOneBody': 'Antes de retirarle los permisos, concede superadmin a otra persona. Si no, nadie podría administrar la plataforma.',
    'store.toggleSuper.removeTitle': 'Retirar permisos a {name}',
    'store.toggleSuper.giveTitle': 'Dar permisos a {name}',
    'store.toggleSuper.removeBody': 'Dejará de tener acceso a la administración global de la plataforma. Mantendrá sus pertenencias en cada organización.',
    'store.toggleSuper.giveBody': 'Pasará a poder ver y gestionar todas las organizaciones de la plataforma. Concédelo solo a personas de máxima confianza.',
    'store.toggleSuper.removeConfirm': 'Retirar',
    'store.toggleSuper.giveConfirm': 'Conceder',

    // Eliminar colonia
    'store.deleteColony.hasCatsTitle': 'Esta colonia tiene gatos',
    'store.deleteColony.hasCatsBody': 'Antes de eliminar la colonia, mueve sus gatos a otra o elimínalos desde su ficha.',
    'store.deleteColony.title': 'Eliminar colonia "{name}"',
    'store.deleteColony.body': 'La colonia desaparecerá del listado y del mapa. Esta acción no se puede deshacer.',
    'store.createColony.errTitle': 'No se pudo crear la colonia',

    // Guardar foto del gato
    'store.savePhoto.errTitle': 'Foto no guardada',
    'store.savePhoto.errSaved': 'La ficha del gato se guardó, pero la foto no: {message}',

    // Eliminar gato
    'store.createCat.errTitle': 'No se pudo crear el gato',
    'store.deleteCat.title': 'Eliminar a {name}',
    'store.deleteCat.bodyNoEvents': 'Se borrará la ficha completa. Esta acción no se puede deshacer.',
    'store.deleteCat.bodyOneEvent': 'Se borrará la ficha y el {n} evento veterinario asociado. Esta acción no se puede deshacer.',
    'store.deleteCat.bodyManyEvents': 'Se borrará la ficha y los {n} eventos veterinarios asociados. Esta acción no se puede deshacer.',
    'store.deleteCat.confirm': 'Eliminar gato',

    // Eventos
    'store.event.errTitle': 'No se pudo registrar el evento',

    // Recordatorios
    'store.createReminder.errTitle': 'No se pudo crear el recordatorio',
    'store.completeReminder.errTitle': 'No se pudo marcar',
    'store.uncompleteReminder.errTitle': 'No se pudo deshacer',
    'store.deleteReminder.title': 'Eliminar recordatorio',
    'store.deleteReminder.body': 'Esto solo borra el recordatorio. Los eventos veterinarios ya registrados se mantienen.',
    'store.deleteReminder.confirm': 'Eliminar',

    // Plantillas de turno
    'store.createTemplate.errTitle': 'No se pudo crear la plantilla',
    'store.deleteTemplate.title': 'Eliminar plantilla de turno',
    'store.deleteTemplate.body': 'Los turnos ya asignados o completados se conservan como registro histórico, pero no se generarán nuevos a partir de esta plantilla.',
    'store.deleteTemplate.confirm': 'Eliminar plantilla',

    // Turnos
    'store.saveShift.errTitle': 'No se pudo guardar el turno',
    'store.updateShift.errTitle': 'No se pudo actualizar el turno',
    'store.unclaimShift.errTitle': 'No se pudo desapuntar',

    // Estadísticas
    'stats.kicker': 'Estadísticas',
    'stats.title': 'Datos de',
    'stats.titleEm': 'la organización',
    'stats.subtitle': 'Evolución del programa CER, gastos veterinarios y distribución de la colonia.',

    'stats.filter.colony': 'Colonia',
    'stats.filter.allColonies': 'Todas las colonias',
    'stats.filter.range': 'Período',
    'stats.range.30d': 'Últimos 30 días',
    'stats.range.12m': 'Últimos 12 meses',
    'stats.range.ytd': 'Este año',
    'stats.range.ly': 'Año anterior',
    'stats.range.all': 'Todo el histórico',

    'stats.kpi.activeCats': 'Gatos activos',
    'stats.kpi.activeCatsSub': '{total} en total',
    'stats.kpi.cerPct': 'CER completado',
    'stats.kpi.cerPctSub': '{n} de {total} esterilizados',
    'stats.kpi.cost': 'Gasto veterinario',
    'stats.kpi.costSub': '{n} intervenciones en el período',
    'stats.kpi.reminders': 'Recordatorios pendientes',
    'stats.kpi.remindersOverdue': '{n} vencidos',
    'stats.kpi.remindersOk': 'Todos al día',

    'stats.sec.colonies': 'Colonias',
    'stats.col.topTitle': 'Top colonias por nº de gatos',
    'stats.col.topHint': 'Las 10 colonias con más gatos registrados',
    'stats.col.cerTitle': 'Estado CER',
    'stats.col.cerHint': 'Distribución de todos los gatos',
    'stats.col.cerTotal': 'Total gatos',

    'stats.sec.vet': 'Veterinario',
    'stats.vet.monthlyTitle': 'Gasto por mes',
    'stats.vet.monthlyHint': 'Suma de costes de eventos veterinarios',
    'stats.vet.monthlyTooltip': 'Gasto',
    'stats.vet.typesTitle': 'Tipos de intervención',
    'stats.vet.typesHint': 'Nº de intervenciones por tipo en el período',
    'stats.vet.typesTotal': 'Total intervenciones',

    'stats.sec.demo': 'Demografía',
    'stats.demo.sexTitle': 'Distribución por sexo',
    'stats.demo.sexHint': 'Todos los gatos registrados',
    'stats.demo.sexTotal': 'Total gatos',
    'stats.demo.ageTitle': 'Distribución por edad',
    'stats.demo.ageMsg': 'El campo edad es texto libre. Para ver estadísticas por edad sería necesario normalizar este campo a un valor numérico en una futura mejora.',

    'stats.empty.noCats': 'No hay gatos en este scope',
    'stats.empty.noEvents': 'No hay intervenciones en el período',
    'stats.empty.noCost': 'No hay costes registrados en el período',
    'stats.empty.noColonies': 'No hay colonias con gatos',

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
    'nav.stats': 'Estadístiques',
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
    'modal.title.editEvent': 'Edita l\'esdeveniment veterinari',
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
    'col.detail.tabCats': 'Gats',
    'col.detail.tabStats': 'Estadístiques',
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
    'catDetail.field.age': 'Edat',
    'catDetail.ageYearOne': '1 any',
    'catDetail.ageYears': '{n} anys',
    'catDetail.ageMonthOne': '1 mes',
    'catDetail.ageMonths': '{n} mesos',
    'catDetail.ageNewborn': 'Nounat',
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
    'catForm.birthLabel': 'Naixement aprox.',
    'catForm.birthHint': 'Només mes i any. L\'edat es calcularà sola.',
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
    'reminderForm.errPastDate': 'No es pot triar una data passada.',

    // ─── Confirm/Notify per defecte ───
    'confirm.accept': 'D\'acord',

    // ─── Pantalla SetPasswordScreen ───
    'setPwd.activateTitle': 'Activa el teu',
    'setPwd.activateTitleEm': 'compte',
    'setPwd.recoveryTitle': 'Defineix la teva',
    'setPwd.recoveryTitleEm': 'nova contrasenya',
    'setPwd.inviteIntro': 'T\'han convidat. Per començar a fer servir Felina, defineix una contrasenya per al teu compte.',
    'setPwd.inviteIntroOrg': 'T\'han convidat a {org}. Per començar a fer servir Felina, defineix una contrasenya per al teu compte.',
    'setPwd.recoveryIntro': 'Introdueix una contrasenya nova per tornar a entrar a Felina.',
    'setPwd.newPwdLabel': 'Contrasenya nova *',
    'setPwd.newPwdHint': '(mín. {min})',
    'setPwd.confirmLabel': 'Confirma la contrasenya *',
    'setPwd.saving': 'Desant…',
    'setPwd.submitInvite': 'Activa el compte i entra',
    'setPwd.submitRecovery': 'Desa i entra',
    'setPwd.cancelLogout': 'Cancel·la i tanca la sessió',

    // ─── ChangePasswordForm ───
    'changePwd.intro': 'La teva nova contrasenya reemplaçarà l\'actual la pròxima vegada que iniciïs sessió.',
    'changePwd.currentLabel': 'Contrasenya actual *',
    'changePwd.newLabel': 'Contrasenya nova *',
    'changePwd.newHint': '(mín. {min})',
    'changePwd.confirmLabel': 'Confirma la contrasenya nova *',
    'changePwd.errMissingCurrent': 'Introdueix la teva contrasenya actual.',
    'changePwd.errSamePwd': 'La nova contrasenya ha de ser diferent de l\'actual.',
    'changePwd.saving': 'Desant…',
    'changePwd.submit': 'Actualitza la contrasenya',

    // ─── ResetPasswordForm ───
    'resetPwd.intro': 'Establiràs una contrasenya nova per a {name}. Comparteix-la de manera segura; podrà canviar-la en iniciar sessió.',
    'resetPwd.newLabel': 'Contrasenya nova *',
    'resetPwd.newHint': '(mín. {min})',
    'resetPwd.confirmLabel': 'Confirma la contrasenya *',
    'resetPwd.saving': 'Desant…',
    'resetPwd.submit': 'Restableix la contrasenya',

    // ─── RgpdGate ───
    'rgpd.welcome': 'Benvingut/da',
    'rgpd.welcomeName': 'Benvingut/da, {name}',
    'rgpd.intro': 'Abans de començar, dues coses que convé tenir clares:',
    'rgpd.dataTitle': 'Les teves dades estan segures.',
    'rgpd.dataBody': 'Es guarden en un servidor europeu (Frankfurt/Dublín) en compliment del RGPD. Només les persones que la teva organització autoritzi poden veure-les.',
    'rgpd.activityTitle': 'Les teves accions queden registrades.',
    'rgpd.activityBody': 'L\'administració de la teva organització pot veure qui fa cada canvi (afegir gats, completar torns, etc.) durant 90 dies. Després s\'esborra automàticament.',
    'rgpd.betaTitle': 'És una versió inicial.',
    'rgpd.betaBody': 'Si veus res estrany o s\'encalla, avisa\'ns — el feedback és el que la farà millor.',
    'rgpd.accept': 'Entesos, comença a fer servir Felina',

    // ─── Bloc demo del LoginScreen ───
    'login.demo.toggle': 'Estàs provant el prototip? Mostra credencials de demostració',
    'login.demo.commonPwd': 'Contrasenya comuna:',
    'login.demo.aina': 'Superadmin',
    'login.demo.marta': 'Admin d\'org',
    'login.demo.jordi': 'Coordinador',
    'login.demo.laia': 'Voluntària',
    'login.demo.pvila': 'Veterinari',
    'login.demo.anna': 'Admin 2a org',

    // ─── Vista Configuració (settings) ───
    'settings.kicker': 'Configuració',
    'settings.title': 'Configuració',
    'settings.org.kicker': 'Organització',
    'settings.org.noCity': 'Sense ciutat',
    'settings.members.title': 'Membres de l\'equip',
    'settings.members.countOne': '{n} persona',
    'settings.members.countMany': '{n} persones',
    'settings.members.invite': 'Convida un membre',
    'settings.roles.title': 'Rols i permisos',
    'settings.session.kicker': 'Sessió',
    'settings.session.changePwd': 'Canvia la contrasenya',
    'settings.session.logout': 'Tanca la sessió',
    'settings.session.leaveOrg': 'Surt d\'aquesta organització',
    'settings.danger.kicker': 'Zona perillosa',
    'settings.danger.body': 'Eliminar l\'organització esborra totes les seves colònies, gats, esdeveniments i membres. Aquesta acció no es pot desfer.',
    'settings.danger.delete': 'Elimina l\'organització permanentment',
    'settings.demo.kicker': 'Mode de proves',
    'settings.demo.body': 'Restableix l\'aplicació al seu estat inicial amb les dades de demostració. Útil si vols començar de zero o si alguna cosa s\'ha trencat a les teves proves. Només afecta a aquest dispositiu — no toca les dades d\'altres persones que estiguin provant Felina.',
    'settings.demo.reset': 'Reinicia les dades d\'aquest navegador',

    // ─── Registre d'activitat (només admin / super_admin) ───
    'settings.activity.title': 'Registre d\'activitat',
    'settings.activity.subtitle': 'Canvis dels últims 90 dies en aquesta organització. Després s\'esborren automàticament.',
    'settings.activity.filterType': 'Tipus',
    'settings.activity.filterUser': 'Persona',
    'settings.activity.filterAll': 'Tots',
    'settings.activity.entityCat': 'Gats',
    'settings.activity.entityColony': 'Colònies',
    'settings.activity.entityEvent': 'Intervencions',
    'settings.activity.entityReminder': 'Recordatoris',
    'settings.activity.entityShift': 'Torns',
    'settings.activity.entityMember': 'Membres',
    'settings.activity.entityOrg': 'Organització',
    'settings.activity.empty': 'Encara no hi ha activitat registrada.',
    'settings.activity.emptyFiltered': 'No hi ha entrades amb aquests filtres.',
    'settings.activity.showMore': 'Mostra\'n més',

    'settings.activityCard.title': 'Registre d\'activitat',
    'settings.activityCard.empty': 'Encara no hi ha activitat registrada',
    'settings.activityCard.countOne': '{n} entrada en els últims 90 dies',
    'settings.activityCard.countMany': '{n} entrades en els últims 90 dies',

    'activity.view.back': 'Torna a Configuració',
    'activity.view.kicker': 'Auditoria',
    'activity.view.title': 'Registre d\'',
    'activity.view.titleEm': 'activitat',
    'activity.view.subtitle': 'Canvis dels últims 90 dies en aquesta organització. Les entrades més antigues s\'esborren automàticament.',
    'activity.view.showing': 'Mostrant {visible} de {total} entrades',

    'activity.group.today': 'Avui',
    'activity.group.yesterday': 'Ahir',
    'activity.group.thisWeek': 'Aquesta setmana',
    'activity.group.older': 'Més antic',

    'activity.action.cat_added': '{userName} ha afegit el gat {entityName}',
    'activity.action.cat_updated': '{userName} ha editat la fitxa de {entityName}',
    'activity.action.cat_status_changed': '{userName} ha canviat l\'estat CER de {entityName}',
    'activity.action.cat_deleted': '{userName} ha eliminat el gat {entityName}',
    'activity.action.colony_added': '{userName} ha creat la colònia {entityName}',
    'activity.action.colony_updated': '{userName} ha editat la colònia {entityName}',
    'activity.action.colony_deleted': '{userName} ha eliminat la colònia {entityName}',
    'activity.action.event_added': '{userName} ha registrat una intervenció veterinària a {entityName}',
    'activity.action.event_updated': '{userName} ha editat una intervenció de {entityName}',
    'activity.action.reminder_added': '{userName} ha programat un recordatori per a {entityName}',
    'activity.action.reminder_completed': '{userName} ha marcat com a fet un recordatori de {entityName}',
    'activity.action.shift_assigned': '{userName} ha assignat un torn a {entityName}',
    'activity.action.shift_completed': '{userName} ha completat un torn a {entityName}',
    'activity.action.member_invited': '{userName} ha convidat {entityName}',
    'activity.action.member_removed': '{userName} ha expulsat {entityName}',
    'activity.action.member_role_changed': '{userName} ha canviat el rol de {entityName}',
    'activity.action.org_updated': '{userName} ha editat dades de l\'organització',

    // ─── MemberRow ───
    'memberRow.you': 'tu',
    'memberRow.changeRole': 'Canvia el rol',
    'memberRow.resetPwd': 'Restableix la contrasenya…',
    'memberRow.expel': 'Expulsa de l\'equip',

    // ─── Modal: Convida membre ───
    'invite.modalTitle': 'Convida un membre',
    'invite.body': 'Si la persona ja té compte a Felina, l\'afegim directament com a membre. Si no, rebrà un correu amb un enllaç per activar el compte (pot trigar uns minuts a arribar i, els primers cops, pot caure a la safata de correu brossa).',
    'invite.emailLabel': 'Correu de la persona *',
    'invite.emailPh': 'persona@exemple.org',
    'invite.invalidEmail': 'Introdueix un correu vàlid.',
    'invite.roleLabel': 'Rol a l\'organització',
    'invite.adding': 'Afegint…',
    'invite.submit': 'Afegeix a l\'equip',

    // ─── OrgForm ───
    'orgForm.nameLabel': 'Nom de l\'organització *',
    'orgForm.namePh': 'Associació Gats del Barri',
    'orgForm.cityLabel': 'Ciutat / municipi',
    'orgForm.cityPh': 'Barcelona',
    'orgForm.emailLabel': 'Correu de contacte',
    'orgForm.emailPh': 'info@exemple.org',

    // ─── App.jsx: pantalles d\'estat i notify() ───
    'app.noOrg.title': 'Hola',
    'app.noOrg.titleName': 'Hola, {name}',
    'app.noOrg.line1': 'El teu compte existeix, però encara no pertanys a cap organització.',
    'app.noOrg.line2': 'Demana a l\'administració de la teva protectora que t\'assigni accés fent servir aquest correu:',
    'app.noOrg.logout': 'Tanca la sessió',

    'app.suspended.title': 'Organització suspesa',
    'app.suspended.body': '{org} està suspesa temporalment. Contacta amb l\'administració de la plataforma per reactivar-la.',
    'app.suspended.others': 'Altres organitzacions',
    'app.suspended.logout': 'Tanca la sessió',

    'app.notify.noPermTitle': 'Sense permís',
    'app.notify.noPermColony': 'El teu rol actual no permet afegir colònies.',
    'app.notify.noPermCat': 'El teu rol actual no permet afegir fitxes de gat.',
    'app.notify.noPermGeneric': 'El teu rol actual no permet aquesta acció.',
    'app.notify.noPermReminder': 'El teu rol actual no permet gestionar recordatoris.',
    'app.notify.noPermShifts': 'Només l\'administració o coordinació poden gestionar plantilles de torns.',
    'app.notify.resetPwdTitle': 'Restableix la contrasenya',
    'app.notify.resetPwdBody': '{name} ha de prémer "He oblidat la contrasenya" a la pantalla d\'inici de sessió per rebre un correu de recuperació. Si necessites fer-ho manualment, contacta amb l\'administració de la plataforma.',

    // ─── Missatges del store (useFelinaStore.js): notify/confirm ───
    'store.noPerm.title': 'Sense permís',
    'store.noPerm.body': 'El teu rol actual no permet aquesta acció. Parla amb l\'administració de la teva organització si creus que hauria.',
    'store.noPerm.bodyShort': 'El teu rol actual no permet aquesta acció.',
    'store.noPerm.deleteColony': 'Només l\'administració o coordinació poden eliminar colònies.',
    'store.noPerm.deleteCat': 'Només l\'administració o coordinació poden eliminar fitxes de gat.',
    'store.noPerm.reminder': 'El teu rol actual no permet gestionar recordatoris.',
    'store.noPerm.deleteReminder': 'Només l\'administració o coordinació poden eliminar recordatoris.',

    'store.invalidOp.title': 'Operació no vàlida',
    'store.invalidOp.colonyOrg': 'Aquesta colònia no pertany a l\'organització activa.',
    'store.invalidOp.catOrg': 'Aquest gat no pertany a l\'organització activa.',
    'store.invalidOp.reminderOrg': 'Aquest recordatori no pertany a l\'organització activa.',
    'store.invalidOp.eventOrg': 'Aquest esdeveniment no pertany a l\'organització activa.',
    'store.invalidOp.templateOrg': 'Aquesta plantilla no pertany a l\'organització activa.',
    'store.invalidOp.shiftOrg': 'Aquest torn no pertany a l\'organització activa.',
    'store.invalidOp.missingCat': 'Falta el gat associat al recordatori.',

    'store.err.saveFail': 'No s\'ha pogut desar',
    'store.err.deleteFail': 'No s\'ha pogut eliminar',
    'store.err.changeFail': 'No s\'ha pogut canviar',
    'store.err.changeStatusFail': 'No s\'ha pogut canviar l\'estat',
    'store.err.changeRoleFail': 'No s\'ha pogut canviar el rol',
    'store.err.expelFail': 'No s\'ha pogut expulsar',
    'store.err.leaveFail': 'No s\'ha pogut sortir',

    'store.createOrg.errTitle': 'No s\'ha pogut crear l\'organització',
    'store.createOrg.errRls': 'Només l\'administració de la plataforma pot crear noves organitzacions. Demana-ho a un superadministrador.',
    'store.createOrg.partialTitle': 'Org creada, però…',
    'store.createOrg.partialBody': 'No s\'ha pogut assignar el teu rol d\'admin: {message}',

    'store.invite.sentTitle': 'Convidatòria enviada',
    'store.invite.sentBody': 'Hem enviat un correu a {email} amb l\'enllaç d\'activació. Apareixerà com a membre quan l\'obri i defineixi una contrasenya. Les primeres invitacions poden trigar uns minuts a arribar i, si no arriben, convé mirar la safata de correu brossa.',
    'store.invite.errNoPerm': 'No tens permisos per afegir membres.',
    'store.invite.errBadEmail': 'Correu no vàlid.',
    'store.invite.errGeneric': 'No s\'ha pogut convidar.',

    'store.changeMyPwd.errNoSession': 'No hi ha cap sessió activa.',
    'store.changeMyPwd.errWrongCurrent': 'La contrasenya actual no és correcta.',
    'store.changeMyPwd.errUpdate': 'No s\'ha pogut canviar la contrasenya: {message}',
    'store.setPwd.errSet': 'No s\'ha pogut establir la contrasenya: {message}',

    'store.resetOtherPwd.errNotFound': 'Usuari no trobat.',
    'store.resetOtherPwd.errSelf': 'Fes servir "Canvia la contrasenya" per al teu propi compte.',
    'store.resetOtherPwd.errUnavailable': 'Restablir la contrasenya d\'una altra persona encara no està disponible des de l\'app. Demana-li que faci servir el botó "He oblidat la contrasenya" a la pantalla d\'inici de sessió (pròximament), o contacta amb l\'administració de la plataforma per fer-ho manualment.',

    'store.expel.title': 'Expulsa membre',
    'store.expel.bodyName': 'Expulsaràs {name} de l\'organització. Perdrà l\'accés però es conserva el seu historial.',
    'store.expel.bodyAnon': 'Expulsaràs aquest membre de l\'organització. Perdrà l\'accés però es conserva el seu historial.',
    'store.expel.confirm': 'Expulsa',

    'store.leaveOrg.title': 'Surt de l\'organització',
    'store.leaveOrg.body': 'Deixaràs de tenir accés a les colònies, gats i torns d\'aquesta organització. L\'administració t\'haurà de tornar a convidar si vols entrar de nou.',
    'store.leaveOrg.confirm': 'Sí, surt',

    'store.deleteOrg.title': 'Elimina "{name}"',
    'store.deleteOrg.bodyOne': 'S\'esborraran definitivament {cols} colònia, {cats} gat i {mems} membre, juntament amb tot el seu historial veterinari. Aquesta acció no es pot desfer.',
    'store.deleteOrg.bodyMany': 'S\'esborraran definitivament {cols} colònies, {cats} gats i {mems} membres, juntament amb tot el seu historial veterinari. Aquesta acció no es pot desfer.',
    'store.deleteOrg.confirm': 'Elimina definitivament',

    'store.resetData.title': 'Reinicia dades de proves',
    'store.resetData.body': 'Es perdran totes les organitzacions, colònies, gats, esdeveniments i torns desats en aquest navegador. Només afecta a aquest dispositiu i no es pot desfer.',
    'store.resetData.confirm': 'Sí, reinicia-ho tot',

    'store.platDeleteOrg.title': 'Elimina "{name}"',
    'store.platDeleteOrg.body': 'Com a superadministració, esborraràs aquesta organització amb {mems} membre(s), {cols} colònia/es i {cats} gat(s). L\'acció és irreversible.',
    'store.platDeleteOrg.confirm': 'Elimina definitivament',

    'store.platSuspendOrg.title': 'Suspèn "{name}"',
    'store.platSuspendOrg.body': 'Mentre estigui suspesa, els seus membres no podran accedir a les seves dades. Podràs reactivar-la en qualsevol moment sense perdre res.',
    'store.platSuspendOrg.confirm': 'Suspèn',

    'store.toggleSuper.onlyOneTitle': 'És l\'únic superadministrador',
    'store.toggleSuper.onlyOneBody': 'Abans de retirar-li els permisos, concedeix superadmin a una altra persona. Si no, ningú podria administrar la plataforma.',
    'store.toggleSuper.removeTitle': 'Retira els permisos a {name}',
    'store.toggleSuper.giveTitle': 'Dóna permisos a {name}',
    'store.toggleSuper.removeBody': 'Deixarà de tenir accés a l\'administració global de la plataforma. Mantindrà les seves pertinences a cada organització.',
    'store.toggleSuper.giveBody': 'Passarà a poder veure i gestionar totes les organitzacions de la plataforma. Concedeix-ho només a persones de màxima confiança.',
    'store.toggleSuper.removeConfirm': 'Retira',
    'store.toggleSuper.giveConfirm': 'Concedeix',

    'store.deleteColony.hasCatsTitle': 'Aquesta colònia té gats',
    'store.deleteColony.hasCatsBody': 'Abans d\'eliminar la colònia, mou els seus gats a una altra o elimina\'ls des de la seva fitxa.',
    'store.deleteColony.title': 'Elimina la colònia "{name}"',
    'store.deleteColony.body': 'La colònia desapareixerà del llistat i del mapa. Aquesta acció no es pot desfer.',
    'store.createColony.errTitle': 'No s\'ha pogut crear la colònia',

    'store.savePhoto.errTitle': 'Foto no desada',
    'store.savePhoto.errSaved': 'La fitxa del gat s\'ha desat, però la foto no: {message}',

    'store.createCat.errTitle': 'No s\'ha pogut crear el gat',
    'store.deleteCat.title': 'Elimina {name}',
    'store.deleteCat.bodyNoEvents': 'S\'esborrarà la fitxa completa. Aquesta acció no es pot desfer.',
    'store.deleteCat.bodyOneEvent': 'S\'esborrarà la fitxa i l\'{n} esdeveniment veterinari associat. Aquesta acció no es pot desfer.',
    'store.deleteCat.bodyManyEvents': 'S\'esborrarà la fitxa i els {n} esdeveniments veterinaris associats. Aquesta acció no es pot desfer.',
    'store.deleteCat.confirm': 'Elimina el gat',

    'store.event.errTitle': 'No s\'ha pogut registrar l\'esdeveniment',

    'store.createReminder.errTitle': 'No s\'ha pogut crear el recordatori',
    'store.completeReminder.errTitle': 'No s\'ha pogut marcar',
    'store.uncompleteReminder.errTitle': 'No s\'ha pogut desfer',
    'store.deleteReminder.title': 'Elimina recordatori',
    'store.deleteReminder.body': 'Això només esborra el recordatori. Els esdeveniments veterinaris ja registrats es mantenen.',
    'store.deleteReminder.confirm': 'Elimina',

    'store.createTemplate.errTitle': 'No s\'ha pogut crear la plantilla',
    'store.deleteTemplate.title': 'Elimina plantilla de torn',
    'store.deleteTemplate.body': 'Els torns ja assignats o completats es conserven com a registre històric, però no se\'n generaran de nous a partir d\'aquesta plantilla.',
    'store.deleteTemplate.confirm': 'Elimina la plantilla',

    'store.saveShift.errTitle': 'No s\'ha pogut desar el torn',
    'store.updateShift.errTitle': 'No s\'ha pogut actualitzar el torn',
    'store.unclaimShift.errTitle': 'No s\'ha pogut desapuntar',

    // Estadístiques
    'stats.kicker': 'Estadístiques',
    'stats.title': 'Dades de',
    'stats.titleEm': 'l\'organització',
    'stats.subtitle': 'Evolució del programa CER, despeses veterinàries i distribució de la colònia.',

    'stats.filter.colony': 'Colònia',
    'stats.filter.allColonies': 'Totes les colònies',
    'stats.filter.range': 'Període',
    'stats.range.30d': 'Últims 30 dies',
    'stats.range.12m': 'Últims 12 mesos',
    'stats.range.ytd': 'Aquest any',
    'stats.range.ly': 'Any anterior',
    'stats.range.all': 'Tot l\'historial',

    'stats.kpi.activeCats': 'Gats actius',
    'stats.kpi.activeCatsSub': '{total} en total',
    'stats.kpi.cerPct': 'CER completat',
    'stats.kpi.cerPctSub': '{n} de {total} esterilitzats',
    'stats.kpi.cost': 'Despesa veterinària',
    'stats.kpi.costSub': '{n} intervencions en el període',
    'stats.kpi.reminders': 'Recordatoris pendents',
    'stats.kpi.remindersOverdue': '{n} vençuts',
    'stats.kpi.remindersOk': 'Tots al dia',

    'stats.sec.colonies': 'Colònies',
    'stats.col.topTitle': 'Top colònies per nº de gats',
    'stats.col.topHint': 'Les 10 colònies amb més gats registrats',
    'stats.col.cerTitle': 'Estat CER',
    'stats.col.cerHint': 'Distribució de tots els gats',
    'stats.col.cerTotal': 'Total gats',

    'stats.sec.vet': 'Veterinari',
    'stats.vet.monthlyTitle': 'Despesa per mes',
    'stats.vet.monthlyHint': 'Suma de costos d\'esdeveniments veterinaris',
    'stats.vet.monthlyTooltip': 'Despesa',
    'stats.vet.typesTitle': 'Tipus d\'intervenció',
    'stats.vet.typesHint': 'Nº d\'intervencions per tipus en el període',
    'stats.vet.typesTotal': 'Total intervencions',

    'stats.sec.demo': 'Demografia',
    'stats.demo.sexTitle': 'Distribució per sexe',
    'stats.demo.sexHint': 'Tots els gats registrats',
    'stats.demo.sexTotal': 'Total gats',
    'stats.demo.ageTitle': 'Distribució per edat',
    'stats.demo.ageMsg': 'El camp edat és text lliure. Per veure estadístiques per edat caldria normalitzar aquest camp a un valor numèric en una millora futura.',

    'stats.empty.noCats': 'No hi ha gats en aquest scope',
    'stats.empty.noEvents': 'No hi ha intervencions en el període',
    'stats.empty.noCost': 'No hi ha costos registrats en el període',
    'stats.empty.noColonies': 'No hi ha colònies amb gats',

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
