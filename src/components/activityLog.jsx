// Vista propia "Registro de actividad". Accesible solo desde Ajustes vía
// botón (no vive en la nav principal — solo la abren admin/super_admin).
//
// Estructura:
//   - Filtros (tipo de entidad, persona)
//   - Timeline agrupado por fecha (Hoy / Ayer / Esta semana / Más antiguo)
//   - Paginación: lotes de 30 entradas al "Mostrar más"
//
// Las plantillas de mensaje de cada acción son claves i18n
// (`activity.action.<key>`) definidas en lib/i18n.jsx en ES y CA.

import { useState, useMemo } from 'react';
import {
  Activity, ChevronLeft,
  PawPrint, MapPin, Stethoscope, Bell, Calendar, User, Settings as SettingsIcon,
} from 'lucide-react';

import { CER_STATUS, EVENT_TYPES, ROLES } from '../constants.js';
import { useTranslation } from '../lib/i18n.jsx';
import { fmtRelative } from '../lib/dates.js';
import { inputStyle } from '../styles.jsx';
import { UserAvatar } from './ui.jsx';

// ───── Constantes visuales ────────────────────────────────────────────────

const ACTIVITY_ICON = {
  cat:      PawPrint,
  colony:   MapPin,
  event:    Stethoscope,
  reminder: Bell,
  shift:    Calendar,
  member:   User,
  org:      SettingsIcon,
};
const ACTIVITY_COLOR = {
  cat:      { color: '#2D4A3E', bg: '#DDE6CC' },
  colony:   { color: '#4A6332', bg: '#E5EDDB' },
  event:    { color: '#2D4A3E', bg: '#CFDBCE' },
  reminder: { color: '#8A6B1F', bg: '#FDF4DE' },
  shift:    { color: '#C67B5C', bg: '#F5DDCE' },
  member:   { color: '#7B6EA8', bg: '#DCD6EE' },
  org:      { color: '#4A433C', bg: '#F2EADB' },
};

const PAGE_SIZE = 30;

// ───── Formatters ─────────────────────────────────────────────────────────

// Construye la frase principal de una entrada usando la plantilla i18n
// `activity.action.<action>`. {userName} y {entityName} se interpolan desde
// la propia entrada.
export const formatActivityMessage = (entry, t) => {
  const { action, userName, entityName } = entry;
  const vars = { userName: userName || '?', entityName: entityName || '?' };
  return t(`activity.action.${action}`, vars) || action;
};

// Línea secundaria opcional con los detalles del cambio. Devuelve '' si la
// entrada no tiene detalles útiles que mostrar.
export const formatActivityDetail = (entry, t) => {
  const { action, metadata = {} } = entry;
  if (action === 'cat_status_changed' && metadata.from && metadata.to) {
    const fromLabel = CER_STATUS[metadata.from] ? t(`cer.${metadata.from}.short`) : metadata.from;
    const toLabel = CER_STATUS[metadata.to] ? t(`cer.${metadata.to}.short`) : metadata.to;
    return `${fromLabel} → ${toLabel}`;
  }
  if (action === 'member_role_changed' && metadata.from && metadata.to) {
    const fromLabel = ROLES[metadata.from] ? t(`role.${metadata.from}.short`) : metadata.from;
    const toLabel = ROLES[metadata.to] ? t(`role.${metadata.to}.short`) : metadata.to;
    return `${fromLabel} → ${toLabel}`;
  }
  if (action === 'member_invited' && metadata.role) {
    return ROLES[metadata.role] ? t(`role.${metadata.role}.short`) : metadata.role;
  }
  if ((action === 'event_added' || action === 'event_updated') && metadata.eventType) {
    const typeLabel = EVENT_TYPES[metadata.eventType] ? t(`event.${metadata.eventType}.label`) : metadata.eventType;
    const costPart = metadata.cost ? ` · ${Number(metadata.cost).toFixed(2)} €` : '';
    return `${typeLabel}${costPart}`;
  }
  if (action === 'reminder_added' && metadata.reminderType) {
    return EVENT_TYPES[metadata.reminderType] ? t(`event.${metadata.reminderType}.label`) : metadata.reminderType;
  }
  if ((action === 'shift_assigned' || action === 'shift_completed') && metadata.date) {
    const slot = metadata.slot ? ` · ${t(`slot.${metadata.slot}.short`)}` : '';
    return `${metadata.date}${slot}`;
  }
  return '';
};

// ───── Agrupador temporal ─────────────────────────────────────────────────
// Devuelve un array de { key, entries } donde key es 'today'|'yesterday'|
// 'thisWeek'|'older'. Vacíos NO se incluyen.
const groupByDate = (entries) => {
  if (!entries.length) return [];
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);

  const buckets = { today: [], yesterday: [], thisWeek: [], older: [] };
  entries.forEach(e => {
    const ms = e.createdAt;
    if (ms >= startOfToday.getTime()) buckets.today.push(e);
    else if (ms >= startOfYesterday.getTime()) buckets.yesterday.push(e);
    else if (ms >= startOf7DaysAgo.getTime()) buckets.thisWeek.push(e);
    else buckets.older.push(e);
  });
  return ['today', 'yesterday', 'thisWeek', 'older']
    .filter(k => buckets[k].length > 0)
    .map(k => ({ key: k, entries: buckets[k] }));
};

// ───── Componente: fila de entrada ────────────────────────────────────────

const ActivityRow = ({ entry, member, border }) => {
  const { t } = useTranslation();
  const Icon = ACTIVITY_ICON[entry.entityType] || Activity;
  const colors = ACTIVITY_COLOR[entry.entityType] || ACTIVITY_COLOR.org;
  const detail = formatActivityDetail(entry, t);

  return (
    <div className="flex items-start gap-3 p-4"
         style={{ borderTop: border ? '1px solid #F0E8D6' : 'none' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: colors.bg }}>
        <Icon className="w-4 h-4" style={{ color: colors.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug" style={{ color: '#1A1712' }}>
          {formatActivityMessage(entry, t)}
        </p>
        {detail && (
          <p className="text-xs mt-0.5 font-mono" style={{ color: '#78706A' }}>{detail}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <UserAvatar name={entry.userName} color={member?.color || '#8A7A5C'} size={24} />
        <span className="text-xs font-mono whitespace-nowrap" style={{ color: '#8A7A5C' }}>
          {fmtRelative(entry.createdAt)}
        </span>
      </div>
    </div>
  );
};

// ───── Vista principal ────────────────────────────────────────────────────

export const ActivityView = ({ activityLog, members = [], onBack }) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Solo personas que tienen al menos una entrada en el log: no tiene sentido
  // ofrecer filtrar por alguien sin actividad. Incluye automáticamente a
  // ex-miembros (expulsados) que dejaron rastro, gracias al userName snapshot.
  const peopleInLog = useMemo(() => {
    const seen = new Map();
    activityLog.forEach(a => {
      if (a.userId && !seen.has(a.userId)) seen.set(a.userId, a.userName);
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [activityLog]);

  const filtered = useMemo(() => {
    return activityLog
      .filter(a => filterType === 'all' || a.entityType === filterType)
      .filter(a => filterUser === 'all' || a.userId === filterUser);
  }, [activityLog, filterType, filterUser]);

  const visibleEntries = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const groups = useMemo(() => groupByDate(visibleEntries), [visibleEntries]);
  const memberById = Object.fromEntries((members || []).map(m => [m.userId, m]));

  const resetVisible = () => setVisible(PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Cabecera con vuelta */}
      <button onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: '#4A433C' }}>
        <ChevronLeft className="w-4 h-4" /> {t('activity.view.back')}
      </button>

      <div>
        <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>{t('activity.view.kicker')}</div>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight" style={{ color: '#1A1712' }}>
          {t('activity.view.title')} <span className="italic" style={{ color: '#C67B5C' }}>{t('activity.view.titleEm')}</span>
        </h1>
        <p className="mt-3 text-[15px] max-w-xl" style={{ color: '#6B635A' }}>
          {t('activity.view.subtitle')}
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-end"
           style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>
            {t('settings.activity.filterType')}
          </label>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); resetVisible(); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="all">{t('settings.activity.filterAll')}</option>
            <option value="cat">{t('settings.activity.entityCat')}</option>
            <option value="colony">{t('settings.activity.entityColony')}</option>
            <option value="event">{t('settings.activity.entityEvent')}</option>
            <option value="reminder">{t('settings.activity.entityReminder')}</option>
            <option value="shift">{t('settings.activity.entityShift')}</option>
            <option value="member">{t('settings.activity.entityMember')}</option>
            <option value="org">{t('settings.activity.entityOrg')}</option>
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>
            {t('settings.activity.filterUser')}
          </label>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); resetVisible(); }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="all">{t('settings.activity.filterAll')}</option>
            {peopleInLog.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Timeline agrupado */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-12 text-center text-sm italic"
             style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#8A7A5C' }}>
          {activityLog.length === 0 ? t('settings.activity.empty') : t('settings.activity.emptyFiltered')}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.key}>
                <h2 className="font-serif text-lg mb-2 flex items-baseline gap-2" style={{ color: '#1A1712' }}>
                  {t(`activity.group.${group.key}`)}
                  <span className="text-xs font-mono" style={{ color: '#8A7A5C' }}>
                    {group.entries.length}
                  </span>
                </h2>
                <div className="rounded-2xl overflow-hidden"
                     style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
                  {group.entries.map((entry, i) => (
                    <ActivityRow key={entry.id} entry={entry}
                                 member={memberById[entry.userId]} border={i > 0} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
              <button onClick={() => setVisible(v => v + PAGE_SIZE)}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
                {t('settings.activity.showMore')}
              </button>
            </div>
          )}
          <div className="text-center text-xs" style={{ color: '#8A7A5C' }}>
            {t('activity.view.showing', { visible: visibleEntries.length, total: filtered.length })}
          </div>
        </>
      )}
    </div>
  );
};
