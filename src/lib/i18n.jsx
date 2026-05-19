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

    'banner.short': 'Versión inicial',
    'banner.long': ' · si encuentras algo raro, escríbenos',

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

    'banner.short': 'Versió inicial',
    'banner.long': ' · si trobes res estrany, escriu-nos',

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
