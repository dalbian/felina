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
