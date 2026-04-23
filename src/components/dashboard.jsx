// Panel principal al entrar a una organización: KPIs, alerta de turnos sin
// cubrir, últimas intervenciones veterinarias y lista abreviada de colonias.

import { MapPin, AlertTriangle, ChevronRight, CalendarClock, Stethoscope } from 'lucide-react';
import { addDays, parseYmd, todayYmd } from '../lib/dates.js';
import { fmtRelative } from '../lib/dates.js';
import { computeShifts, isShiftPast as isShiftPastRaw } from '../lib/shifts.js';
import { EVENT_TYPES, SHIFT_TASKS, SHIFT_SLOTS } from '../constants.js';
import { UserAvatar } from './ui.jsx';

const isShiftPast = (shift) => isShiftPastRaw(shift, todayYmd());

export const Dashboard = ({ cats, colonies, events, templates, shifts, members, onNavigate }) => {
  const totalCats = cats.length;
  const sterilized = cats.filter(c => ['esterilizado','en_colonia','en_acogida','adoptado'].includes(c.cerStatus)).length;
  const pendientes = cats.filter(c => c.cerStatus === 'pendiente' || c.cerStatus === 'capturado').length;
  const sterilizedPct = totalCats > 0 ? Math.round((sterilized/totalCats)*100) : 0;

  const recentEvents = [...events].sort((a,b) => b.date - a.date).slice(0, 5);
  const catsById = Object.fromEntries(cats.map(c => [c.id, c]));

  // Turnos de los próximos 7 días (+ retrospección a hoy para detectar sin cubrir)
  const rangeFrom = new Date(); rangeFrom.setHours(0,0,0,0);
  const rangeTo = addDays(rangeFrom, 7);
  const weekShifts = computeShifts({ templates: templates || [], shifts: shifts || [], colonyIds: null, from: rangeFrom, to: rangeTo });
  const uncovered = weekShifts.filter(s => s.status === 'open' && isShiftPast(s));
  const upcoming = weekShifts.filter(s => s.status !== 'done' && !isShiftPast(s)).slice(0, 5);
  const colonyById = Object.fromEntries(colonies.map(c => [c.id, c]));
  const memberById = Object.fromEntries((members || []).map(m => [m.userId, m]));

  const stat = ({ value, label, sub, color = '#2D4A3E', onClick }) => (
    <button onClick={onClick}
            className="text-left p-5 rounded-2xl transition-all hover:translate-y-[-2px]"
            style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
      <div className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#8A7A5C', letterSpacing: '0.12em' }}>{label}</div>
      <div className="font-serif text-3xl md:text-4xl leading-none mb-1" style={{ color, fontFeatureSettings: '"lnum"' }}>{value}</div>
      {sub && <div className="text-xs mt-2" style={{ color: '#78706A' }}>{sub}</div>}
    </button>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>Panel</div>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight" style={{ color: '#1A1712' }}>
          Resumen <span className="italic" style={{ color: '#C67B5C' }}>general</span>
        </h1>
        <p className="mt-3 text-[15px] max-w-xl" style={{ color: '#6B635A' }}>
          Estado actual de las colonias, gatos fichados y últimas intervenciones registradas.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stat({ value: colonies.length, label: 'Colonias', sub: 'activas', onClick: () => onNavigate('colonies') })}
        {stat({ value: totalCats,       label: 'Gatos',    sub: `fichados en la app`, onClick: () => onNavigate('cats') })}
        {stat({ value: `${sterilizedPct}%`, label: 'Esterilizados', sub: `${sterilized} de ${totalCats}`, color: '#6B8E4E' })}
        {stat({ value: pendientes, label: 'Por capturar', sub: pendientes > 0 ? 'requieren atención' : 'al día', color: pendientes > 0 ? '#C67B5C' : '#6B8E4E' })}
      </div>

      {(upcoming.length > 0 || uncovered.length > 0) && (
        <div className="rounded-2xl p-5"
             style={{
               backgroundColor: uncovered.length > 0 ? '#F5DDCE' : '#FDFAF3',
               boxShadow: `0 0 0 1px ${uncovered.length > 0 ? '#E5B8A8' : '#EADFC9'}`,
             }}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: uncovered.length > 0 ? '#FDFAF3' : '#DDE6CC' }}>
                {uncovered.length > 0
                  ? <AlertTriangle className="w-5 h-5" style={{ color: '#B15A3A' }} />
                  : <CalendarClock className="w-5 h-5" style={{ color: '#4A6332' }} />}
              </div>
              <div>
                <h2 className="font-serif text-xl" style={{ color: '#1A1712' }}>
                  {uncovered.length > 0
                    ? <>{uncovered.length} turno{uncovered.length > 1 ? 's' : ''} sin cubrir esta semana</>
                    : 'Semana bien organizada'}
                </h2>
                <p className="text-xs mt-1" style={{ color: uncovered.length > 0 ? '#8A4A2F' : '#78706A' }}>
                  {uncovered.length > 0
                    ? 'Hay turnos programados que han quedado sin asignar. Revisa el calendario.'
                    : `${upcoming.length} próximo${upcoming.length !== 1 ? 's' : ''} turno${upcoming.length !== 1 ? 's' : ''} programado${upcoming.length !== 1 ? 's' : ''} en los próximos 7 días.`}
                </p>
              </div>
            </div>
            <button onClick={() => onNavigate('calendar')}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1"
                    style={{ backgroundColor: uncovered.length > 0 ? '#B15A3A' : '#1F3A2F', color: '#F8F3E8' }}>
              Ir al calendario <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {upcoming.length > 0 && (
            <div className="space-y-1.5">
              {upcoming.map(s => {
                const col = colonyById[s.colonyId];
                const asg = memberById[s.assigneeId];
                const t = SHIFT_TASKS[s.task];
                const Icon = t.icon;
                const d = parseYmd(s.date);
                const open = s.status === 'open';
                return (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                       style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ backgroundColor: t.bg }}>
                      <Icon className="w-4 h-4" style={{ color: t.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: '#1A1712' }}>{col?.name || '—'}</div>
                      <div className="text-xs font-mono" style={{ color: '#78706A' }}>
                        {d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' })} · {SHIFT_SLOTS[s.slot]?.label || ''}
                      </div>
                    </div>
                    {open ? (
                      <span className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: '#F2EADB', color: '#8A7A5C' }}>libre</span>
                    ) : (
                      <UserAvatar name={asg?.name} color={asg?.color} size={28} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-serif text-2xl" style={{ color: '#1A1712' }}>Últimas intervenciones</h2>
            <button className="text-xs font-medium hover:underline" style={{ color: '#2D4A3E' }}>Ver historial</button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm" style={{ color: '#78706A' }}>Aún no hay intervenciones registradas.</div>
            ) : recentEvents.map((e, i) => {
              const cat = catsById[e.catId];
              const type = EVENT_TYPES[e.type];
              const Icon = type?.icon || Stethoscope;
              return (
                <div key={e.id} className="flex items-center gap-4 p-4"
                     style={{ borderTop: i > 0 ? '1px solid #F0E8D6' : 'none' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: '#F2EADB' }}>
                    <Icon className="w-4 h-4" style={{ color: type?.color || '#6B635A' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm truncate" style={{ color: '#1A1712' }}>{cat?.name || 'Gato eliminado'}</span>
                      <span className="text-xs" style={{ color: '#8A7A5C' }}>·</span>
                      <span className="text-sm" style={{ color: '#4A433C' }}>{type?.label}</span>
                    </div>
                    {e.notes && <div className="text-xs mt-0.5 truncate" style={{ color: '#78706A' }}>{e.notes}</div>}
                  </div>
                  <div className="text-xs font-mono text-right flex-shrink-0" style={{ color: '#8A7A5C' }}>
                    {fmtRelative(e.date)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl mb-4" style={{ color: '#1A1712' }}>Colonias</h2>
          <div className="space-y-2">
            {colonies.slice(0, 4).map(col => {
              const count = cats.filter(c => c.colonyId === col.id).length;
              return (
                <button key={col.id} onClick={() => onNavigate('colony', col.id)}
                        className="w-full text-left p-4 rounded-xl flex items-start gap-3 transition-colors hover:bg-[#F5EDD8]"
                        style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: '#DDE6CC' }}>
                    <MapPin className="w-4 h-4" style={{ color: '#4A6332' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: '#1A1712' }}>{col.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#78706A' }}>{count} gato{count !== 1 ? 's' : ''}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 mt-2 flex-shrink-0" style={{ color: '#B8A888' }} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
