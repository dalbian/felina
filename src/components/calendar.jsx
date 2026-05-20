// Calendario de turnos: vistas (Mes, Semana, Mis turnos, Plantillas) y los
// componentes asociados (chips, filas, formularios de plantilla y asignación,
// detalle de turno, modal de día). Todo lo del calendario vive aquí porque
// está fuertemente acoplado entre sí.

import { useState } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, X, Edit3, Calendar, AlertTriangle, Check,
  CheckCircle2, Clock, UserCheck, CalendarDays, CalendarClock, Repeat, Trash2,
  UserMinus, UserPlus, MapPin,
} from 'lucide-react';
import {
  ymd, parseYmd, todayYmd, addDays, startOfWeek, startOfMonth,
  fmtDate, fmtDayLong, fmtMonth, fmtWeekday, getDateLocale,
} from '../lib/dates.js';
import { computeShifts, isShiftPast as isShiftPastRaw, slotFromTime } from '../lib/shifts.js';
import { can } from '../lib/permissions.js';
import { SHIFT_TASKS, SHIFT_SLOTS, DAYS_OF_WEEK, ROLES } from '../constants.js';
import { useTranslation } from '../lib/i18n.jsx';
import { TaskPill, EmptyState, UserAvatar, Field, RoleBadge } from './ui.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';

// Wrapper local para que isShiftPast mantenga su firma de un único argumento
// dentro de los componentes (delega en lib/shifts.js inyectándole hoy).
const isShiftPast = (shift) => isShiftPastRaw(shift, todayYmd());

// Chip compacto de turno para la vista mensual / semanal (mini, 1 línea).
// OJO: la variable local de la tarea se llama `task` (no `t`) para no tapar
// la función `t` de traducción del hook useTranslation.
export const ShiftChip = ({ shift, assignee, onClick, compact = false }) => {
  const { t } = useTranslation();
  const task = SHIFT_TASKS[shift.task] || SHIFT_TASKS.otros;
  const done = shift.status === 'done';
  const open = shift.status === 'open';
  const past = isShiftPast(shift);
  return (
    <button onClick={onClick}
            className="w-full flex items-center gap-1 rounded px-1.5 py-0.5 text-left transition-colors"
            style={{
              backgroundColor: done ? '#F2EADB' : (open ? '#FDFAF3' : task.bg),
              color: done ? '#78706A' : task.color,
              boxShadow: open ? `0 0 0 1px ${past ? '#E5B8A8' : '#EADFC9'}` : 'none',
              opacity: done ? 0.75 : 1,
            }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: done ? '#B8A888' : (open ? (past ? '#B15A3A' : '#B8A888') : task.color) }} />
      <span className="text-[10px] flex-shrink-0 font-medium" style={{ color: done ? '#8A7A5C' : task.color }}>{shift.slot ? t(`slot.${shift.slot}.short`) : ''}</span>
      {!compact && (
        <span className="text-[10px] truncate flex-1">
          {open ? (past ? t('cal.uncovered') : t('cal.chipFree')) : (assignee?.name?.split(' ')[0] || '—')}
        </span>
      )}
      {done && <Check className="w-2.5 h-2.5 flex-shrink-0" />}
    </button>
  );
};

// Fila de turno (vista de lista, más información)
export const ShiftRow = ({ shift, colony, assignee, onClick, showDate = true }) => {
  const { t } = useTranslation();
  const task = SHIFT_TASKS[shift.task] || SHIFT_TASKS.otros;
  const Icon = task.icon;
  const open = shift.status === 'open';
  const done = shift.status === 'done';
  const past = isShiftPast(shift);
  const uncovered = open && past;
  const d = parseYmd(shift.date);

  return (
    <button onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[#F2EADB]"
            style={{ backgroundColor: '#FDFAF3', boxShadow: `0 0 0 1px ${uncovered ? '#E5B8A8' : '#EADFC9'}` }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: done ? '#F2EADB' : task.bg }}>
        <Icon className="w-5 h-5" style={{ color: done ? '#8A7A5C' : task.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium truncate" style={{ color: '#1A1712' }}>{colony?.name || '—'}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: task.color }}>{shift.task ? t(`task.${shift.task}.short`) : ''}</span>
        </div>
        <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: '#78706A' }}>
          {showDate && <span className="font-mono">{d.toLocaleDateString(getDateLocale(), { weekday: 'short', day: '2-digit', month: 'short' })}</span>}
          <span>· {shift.slot ? t(`slot.${shift.slot}.label`) : ''}</span>
          {done ? (
            <span className="inline-flex items-center gap-1" style={{ color: '#6B8E4E' }}>
              <CheckCircle2 className="w-3 h-3" /> {t('cal.row.done')}
            </span>
          ) : open ? (
            <span className="inline-flex items-center gap-1" style={{ color: uncovered ? '#B15A3A' : '#8A7A5C' }}>
              {uncovered ? <><AlertTriangle className="w-3 h-3" /> {t('cal.uncovered')}</> : <>· {t('cal.chipFree')}</>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">· <UserCheck className="w-3 h-3" /> {assignee?.name?.split(' ')[0] || '—'}</span>
          )}
        </div>
      </div>
      {!open && assignee && (
        <UserAvatar name={assignee.name} color={assignee.color} size={32} />
      )}
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#B8A888' }} />
    </button>
  );
};

// Formulario: plantilla de turno recurrente
export const ShiftTemplateForm = ({ template, colonies, onSave, onCancel, onDelete, canDelete }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(template ? { ...template, slot: template.slot || slotFromTime(template.time) } : {
    colonyId: colonies[0]?.id || '',
    task: 'alimentacion',
    daysOfWeek: [1,2,3,4,5,6,0],
    slot: 'afternoon',
    notes: '',
    active: true,
  });

  const toggleDay = (n) => {
    const has = form.daysOfWeek.includes(n);
    setForm({ ...form, daysOfWeek: has ? form.daysOfWeek.filter(d => d !== n) : [...form.daysOfWeek, n].sort() });
  };

  const presets = [
    { labelKey: 'cal.tpl.preset.all',      days: [1,2,3,4,5,6,0] },
    { labelKey: 'cal.tpl.preset.weekdays', days: [1,2,3,4,5] },
    { labelKey: 'cal.tpl.preset.weekend',  days: [6,0] },
    { labelKey: 'cal.tpl.preset.mwf',      days: [1,3,5] },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('cal.tpl.colony')}</label>
        <select value={form.colonyId} onChange={e => setForm({ ...form, colonyId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>{t('cal.tpl.task')}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SHIFT_TASKS).map(([k, v]) => {
            const Icon = v.icon;
            const active = form.task === k;
            return (
              <button key={k} onClick={() => setForm({ ...form, task: k })}
                      className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active ? v.color : '#FFFFFF',
                        color: active ? '#FDFAF3' : '#4A433C',
                        boxShadow: active ? 'none' : '0 0 0 1px #EADFC9',
                      }}>
                <Icon className="w-4 h-4" /> {t(`task.${k}.label`)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={labelStyle}>{t('cal.tpl.daysOfWeek')}</label>
          <div className="flex gap-1">
            {presets.map(p => (
              <button key={p.labelKey} onClick={() => setForm({ ...form, daysOfWeek: p.days })}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#F2EADB', color: '#6B635A' }}>
                {t(p.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5">
          {DAYS_OF_WEEK.map(d => {
            const active = form.daysOfWeek.includes(d.n);
            return (
              <button key={d.n} onClick={() => toggleDay(d.n)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                      title={t(`day.${d.n}.label`)}
                      style={{
                        backgroundColor: active ? '#1F3A2F' : '#FFFFFF',
                        color: active ? '#F8F3E8' : '#4A433C',
                        boxShadow: active ? 'none' : '0 0 0 1px #EADFC9',
                      }}>
                {t(`day.${d.n}.short`)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>{t('cal.tpl.slot')}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(SHIFT_SLOTS).map(([k, v]) => {
            const Icon = v.icon;
            const active = form.slot === k;
            return (
              <button key={k} type="button" onClick={() => setForm({ ...form, slot: k })}
                      className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active ? v.color : '#FFFFFF',
                        color: active ? '#FDFAF3' : '#4A433C',
                        boxShadow: active ? 'none' : '0 0 0 1px #EADFC9',
                      }}>
                <Icon className="w-4 h-4" /> {t(`slot.${k}.label`)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('cal.tpl.notes')}</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder={t('cal.tpl.notesPlaceholder')} />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })}
               className="w-4 h-4 rounded" />
        <span className="text-sm" style={{ color: '#4A433C' }}>{t('cal.tpl.activeLabel')}</span>
      </label>

      <div className="flex gap-2 pt-2">
        {template && canDelete && (
          <button onClick={onDelete}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5"
                  style={{ backgroundColor: '#F5DDCE', color: '#B15A3A' }}>
            <Trash2 className="w-4 h-4" /> {t('cal.tpl.delete')}
          </button>
        )}
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('common.cancel')}</button>
        <button onClick={() => onSave(form)}
                disabled={!form.colonyId || form.daysOfWeek.length === 0}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {template ? t('cal.tpl.save') : t('cal.tpl.create')}
        </button>
      </div>
    </div>
  );
};

// Formulario: asignar turno a un miembro
export const ShiftAssignForm = ({ shift, members, colony, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [assigneeId, setAssigneeId] = useState(shift.assigneeId || members[0]?.userId || '');
  const assignable = members.filter(m => m.role !== 'vet'); // vet no cubre turnos
  const d = parseYmd(shift.date);
  // Fallback igual que en otros usos del archivo: si por algún motivo task no
  // coincide con una key conocida, evitamos crashear el render.
  const task = SHIFT_TASKS[shift.task] || SHIFT_TASKS.otros;
  const Icon = task.icon;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl" style={{ backgroundColor: '#F2EADB' }}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" style={{ color: task.color }} />
          <span className="text-sm font-medium" style={{ color: '#1A1712' }}>{shift.task ? t(`task.${shift.task}.label`) : ''}</span>
        </div>
        <div className="text-xs" style={{ color: '#6B635A' }}>
          {colony?.name} · {d.toLocaleDateString(getDateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} · {shift.slot ? t(`slot.${shift.slot}.label`) : ''}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>{t('cal.assign.to')}</label>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {assignable.map(m => {
            const active = assigneeId === m.userId;
            return (
              <button key={m.userId} onClick={() => setAssigneeId(m.userId)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors"
                      style={{
                        backgroundColor: active ? '#DDE6CC' : '#FFFFFF',
                        boxShadow: `0 0 0 1px ${active ? '#6B8E4E' : '#EADFC9'}`,
                      }}>
                <UserAvatar name={m.name} color={m.color} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: '#1A1712' }}>{m.name}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: ROLES[m.role]?.color }}>
                    {m.role ? t(`role.${m.role}.short`) : ''}
                  </div>
                </div>
                {active && <Check className="w-4 h-4" style={{ color: '#4A6332' }} />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('common.cancel')}</button>
        <button onClick={() => onSave(assigneeId)}
                disabled={!assigneeId}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('cal.assign.btn')}</button>
      </div>
    </div>
  );
};

// Modal de detalle de un turno: muestra info + acciones contextuales según estado y rol
export const ShiftDetailView = ({ shift, colony, assignee, completedBy, currentUser, currentRole,
                          onClaim, onUnclaim, onComplete, onUncomplete, onAssign, onEditTemplate, onClose }) => {
  const { t } = useTranslation();
  const task = SHIFT_TASKS[shift.task] || SHIFT_TASKS.otros;
  const Icon = task.icon;
  const open = shift.status === 'open';
  const done = shift.status === 'done';
  const assigned = shift.status === 'assigned';
  const mine = assignee?.id === currentUser?.id;
  const past = isShiftPast(shift);
  const d = parseYmd(shift.date);

  const canClaim = open && can(currentRole, 'claim_shift');
  const canAssign = can(currentRole, 'assign_shift');
  const canComplete = (assigned || open) && can(currentRole, 'complete_shift');
  const canUnclaim = assigned && (mine || canAssign);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: task.bg }}>
          <Icon className="w-6 h-6" style={{ color: task.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-lg" style={{ color: '#1A1712' }}>{shift.task ? t(`task.${shift.task}.label`) : ''}</div>
          <div className="text-xs" style={{ color: '#78706A' }}>{colony?.name}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#F2EADB' }}>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>{t('cal.detail.date')}</div>
          <div className="font-mono" style={{ color: '#1A1712' }}>
            {d.toLocaleDateString(getDateLocale(), { weekday: 'short', day: '2-digit', month: 'short' })}
          </div>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#F2EADB' }}>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>{t('cal.detail.slot')}</div>
          <div style={{ color: '#1A1712' }}>{shift.slot ? t(`slot.${shift.slot}.label`) : '—'}</div>
        </div>
      </div>

      {done ? (
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#DDE6CC' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4" style={{ color: '#4A6332' }} />
            <span className="text-sm font-medium" style={{ color: '#4A6332' }}>{t('cal.detail.completed')}</span>
          </div>
          <div className="text-xs" style={{ color: '#4A6332' }}>
            {t('cal.detail.by')} <strong>{completedBy?.name || '—'}</strong> · {fmtDate(shift.completedAt)}
          </div>
          {shift.notes && <div className="text-xs mt-2 pt-2 border-t" style={{ color: '#4A6332', borderColor: '#C3CFB1' }}>{shift.notes}</div>}
        </div>
      ) : open ? (
        <div className="p-3 rounded-xl"
             style={{ backgroundColor: past ? '#F5DDCE' : '#F2EADB' }}>
          <div className="flex items-center gap-2">
            {past ? <AlertTriangle className="w-4 h-4" style={{ color: '#B15A3A' }} /> : <Clock className="w-4 h-4" style={{ color: '#8A7A5C' }} />}
            <span className="text-sm font-medium" style={{ color: past ? '#B15A3A' : '#6B635A' }}>
              {past ? t('cal.uncovered') : t('cal.detail.openTitle')}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F2EADB' }}>
          <UserAvatar name={assignee?.name} color={assignee?.color} size={40} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>{t('cal.detail.assignedTo')}</div>
            <div className="text-sm font-medium" style={{ color: '#1A1712' }}>{assignee?.name || '—'}</div>
          </div>
        </div>
      )}

      {shift._template?.notes && !done && (
        <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#4A433C' }}>
          <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>{t('cal.detail.instructions')}</div>
          {shift._template.notes}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {canClaim && !mine && (
          <button onClick={onClaim}
                  className="w-full py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            <UserCheck className="w-4 h-4" /> {t('cal.detail.claim')}
          </button>
        )}
        {canAssign && open && (
          <button onClick={onAssign}
                  className="w-full py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
            <UserPlus className="w-4 h-4" /> {t('cal.detail.assignOther')}
          </button>
        )}
        {canAssign && assigned && (
          <button onClick={onAssign}
                  className="w-full py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
            <UserCheck className="w-4 h-4" /> {t('cal.detail.reassign')}
          </button>
        )}
        {canComplete && !done && (
          <button onClick={onComplete}
                  className="w-full py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#6B8E4E', color: '#F8F3E8' }}>
            <Check className="w-4 h-4" /> {t('cal.detail.markDone')}
          </button>
        )}
        {canUnclaim && (
          <button onClick={onUnclaim}
                  className="w-full py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F5DDCE', color: '#B15A3A' }}>
            <UserMinus className="w-4 h-4" /> {mine ? t('cal.detail.leaveFree') : t('cal.detail.unassign')}
          </button>
        )}
        {done && can(currentRole, 'complete_shift') && (
          <button onClick={onUncomplete}
                  className="w-full py-2 rounded-xl text-xs font-medium"
                  style={{ backgroundColor: '#F2EADB', color: '#6B635A' }}>
            {t('cal.detail.undoComplete')}
          </button>
        )}
        {shift._template && can(currentRole, 'manage_shifts') && (
          <button onClick={onEditTemplate}
                  className="w-full py-2 rounded-xl text-xs font-medium inline-flex items-center justify-center gap-1.5"
                  style={{ color: '#8A7A5C' }}>
            <Repeat className="w-3.5 h-3.5" /> {t('cal.detail.editTemplate')}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CALENDARIO: VISTAS (mes, semana, mis turnos, plantillas)
// ─────────────────────────────────────────────────────────────────────────────

export const CalendarFilters = ({ colonies, colonyFilter, setColonyFilter, taskFilter, setTaskFilter }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <select value={colonyFilter} onChange={e => setColonyFilter(e.target.value)}
              className="pl-3 pr-9 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
        <option value="all">{t('cal.allColonies')}</option>
        {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}
              className="pl-3 pr-9 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
        <option value="all">{t('cal.allTasks')}</option>
        {Object.entries(SHIFT_TASKS).map(([k]) => <option key={k} value={k}>{t(`task.${k}.label`)}</option>)}
      </select>
    </div>
  );
};

export const MonthView = ({ cursor, setCursor, shifts, members, onSelectShift, onSelectDay }) => {
  const { t } = useTranslation();
  const first = startOfMonth(cursor);
  const monthStart = startOfWeek(first);
  // 6 filas × 7 columnas = 42 días (cubre cualquier mes)
  const days = [];
  for (let i = 0; i < 42; i++) days.push(addDays(monthStart, i));

  const today = todayYmd();
  const shiftsByDay = {};
  for (const s of shifts) {
    (shiftsByDay[s.date] ||= []).push(s);
  }
  const memberById = Object.fromEntries(members.map(m => [m.userId, m]));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(addDays(startOfMonth(cursor), -1))}
                  className="p-1.5 rounded-lg hover:bg-[#F2EADB]">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4A433C' }} />
          </button>
          <div className="font-serif text-lg capitalize" style={{ color: '#1A1712' }}>{fmtMonth(cursor)}</div>
          <button onClick={() => { const n = new Date(cursor); n.setMonth(n.getMonth()+1); n.setDate(1); setCursor(n); }}
                  className="p-1.5 rounded-lg hover:bg-[#F2EADB]">
            <ChevronRight className="w-4 h-4" style={{ color: '#4A433C' }} />
          </button>
        </div>
        <button onClick={() => setCursor(new Date())}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('cal.today')}</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map(d => (
          <div key={d.n} className="text-[10px] uppercase tracking-widest text-center py-1" style={{ color: '#8A7A5C' }}>
            {t(`day.${d.n}.label`).slice(0,3)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = key === today;
          const dayShifts = shiftsByDay[key] || [];
          const uncovered = dayShifts.filter(s => s.status === 'open' && isShiftPast(s)).length;
          const visibleShifts = dayShifts.slice(0, 3);
          const moreCount = dayShifts.length - visibleShifts.length;

          // Móvil: solo puntos de colores por tarea (hasta 10). Suficiente para un
          // vistazo general; el detalle se ve tocando el día (abre DayListModal).
          const mobileDots = dayShifts.slice(0, 10);
          return (
            <div key={i} onClick={() => onSelectDay(d)}
                 className="min-h-[58px] md:min-h-[92px] p-1 md:p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[#F2EADB]"
                 style={{
                   backgroundColor: isToday ? '#DDE6CC' : (inMonth ? '#FDFAF3' : '#F8F3E8'),
                   boxShadow: isToday ? '0 0 0 1px #6B8E4E' : '0 0 0 1px #EADFC9',
                   opacity: inMonth ? 1 : 0.55,
                 }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[11px] md:text-xs" style={{ color: isToday ? '#1F3A2F' : (inMonth ? '#1A1712' : '#8A7A5C'), fontWeight: isToday ? 600 : 400 }}>
                  {d.getDate()}
                </span>
                {uncovered > 0 && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px]"
                        style={{ backgroundColor: '#B15A3A', color: '#F8F3E8' }}
                        title={t('cal.uncoveredTooltip', { n: uncovered })}>
                    {uncovered}
                  </span>
                )}
              </div>
              {/* Escritorio: chips con texto */}
              <div className="hidden md:block space-y-0.5">
                {visibleShifts.map(s => (
                  <ShiftChip key={s.id} shift={s} assignee={memberById[s.assigneeId]}
                             onClick={(e) => { e.stopPropagation(); onSelectShift(s); }}
                             compact />
                ))}
                {moreCount > 0 && (
                  <div className="text-[10px] px-1.5" style={{ color: '#8A7A5C' }}>{t('cal.moreCount', { n: moreCount })}</div>
                )}
              </div>
              {/* Móvil: puntos de colores por tarea */}
              {mobileDots.length > 0 && (
                <div className="md:hidden flex flex-wrap gap-[3px] items-center">
                  {mobileDots.map(s => {
                    const taskColor = SHIFT_TASKS[s.task]?.color || '#78706A';
                    const done = s.status === 'done';
                    const missed = s.status === 'open' && isShiftPast(s);
                    return (
                      <span key={s.id}
                            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: done ? '#B8A888' : (missed ? '#B15A3A' : taskColor),
                              opacity: done ? 0.7 : 1,
                            }} />
                    );
                  })}
                  {dayShifts.length > mobileDots.length && (
                    <span className="text-[9px] leading-none" style={{ color: '#8A7A5C' }}>+{dayShifts.length - mobileDots.length}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <LegendRow />
    </div>
  );
};

export const LegendRow = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t text-[10px]"
         style={{ borderColor: '#EADFC9', color: '#78706A' }}>
      <span className="uppercase tracking-widest">{t('cal.legend')}</span>
      {Object.entries(SHIFT_TASKS).map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
          {t(`task.${k}.label`)}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 ml-auto">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#B15A3A' }} /> {t('cal.uncovered')}
      </span>
    </div>
  );
};

export const WeekView = ({ cursor, setCursor, shifts, members, colonies, onSelectShift }) => {
  const { t } = useTranslation();
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayYmd();
  const memberById = Object.fromEntries(members.map(m => [m.userId, m]));
  const colonyById = Object.fromEntries(colonies.map(c => [c.id, c]));

  const rangeLabel = `${start.toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString(getDateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(addDays(start, -7))}
                  className="p-1.5 rounded-lg hover:bg-[#F2EADB]">
            <ChevronLeft className="w-4 h-4" style={{ color: '#4A433C' }} />
          </button>
          <div className="font-serif text-lg" style={{ color: '#1A1712' }}>{t('cal.weekOf', { range: rangeLabel })}</div>
          <button onClick={() => setCursor(addDays(start, 7))}
                  className="p-1.5 rounded-lg hover:bg-[#F2EADB]">
            <ChevronRight className="w-4 h-4" style={{ color: '#4A433C' }} />
          </button>
        </div>
        <button onClick={() => setCursor(new Date())}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('cal.thisWeek')}</button>
      </div>

      <div className="hidden md:grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const key = ymd(d);
          const isToday = key === today;
          const dayShifts = shifts.filter(s => s.date === key);
          return (
            <div key={i} className="rounded-xl p-2 min-h-[200px]"
                 style={{
                   backgroundColor: isToday ? '#DDE6CC' : '#FDFAF3',
                   boxShadow: isToday ? '0 0 0 1px #6B8E4E' : '0 0 0 1px #EADFC9',
                 }}>
              <div className="text-center mb-2 pb-2 border-b" style={{ borderColor: isToday ? '#C3CFB1' : '#EADFC9' }}>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>
                  {fmtWeekday(d, true)}
                </div>
                <div className="font-mono text-base" style={{ color: isToday ? '#1F3A2F' : '#1A1712', fontWeight: isToday ? 600 : 400 }}>
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dayShifts.length === 0 ? (
                  <div className="text-[10px] text-center py-2" style={{ color: '#B8A888' }}>—</div>
                ) : dayShifts.map(s => (
                  <button key={s.id} onClick={() => onSelectShift(s)}
                          className="w-full text-left p-1.5 rounded-lg transition-colors hover:opacity-90"
                          style={{
                            backgroundColor: s.status === 'done' ? '#F2EADB' : (s.status === 'open' ? '#FFFFFF' : SHIFT_TASKS[s.task].bg),
                            boxShadow: s.status === 'open' ? `0 0 0 1px ${isShiftPast(s) ? '#E5B8A8' : '#EADFC9'}` : 'none',
                            opacity: s.status === 'done' ? 0.75 : 1,
                          }}>
                    <div className="text-[10px] font-medium" style={{ color: SHIFT_TASKS[s.task].color }}>
                      {s.slot ? t(`slot.${s.slot}.short`) : ''} · {colonyById[s.colonyId]?.name?.slice(0, 14)}
                    </div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: '#4A433C' }}>
                      {s.status === 'done' && <Check className="w-2.5 h-2.5" style={{ color: '#6B8E4E' }} />}
                      {s.status === 'open' ? (isShiftPast(s) ? t('cal.uncovered') : t('cal.chipFree')) : (memberById[s.assigneeId]?.name?.split(' ')[0] || '—')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Móvil: lista agrupada por día */}
      <div className="md:hidden space-y-4">
        {days.map((d, i) => {
          const key = ymd(d);
          const isToday = key === today;
          const dayShifts = shifts.filter(s => s.date === key);
          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <div className="font-serif text-sm capitalize" style={{ color: isToday ? '#1F3A2F' : '#1A1712' }}>
                  {fmtDayLong(d)}
                </div>
                {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#DDE6CC', color: '#4A6332' }}>{t('cal.todayBadge')}</span>}
              </div>
              {dayShifts.length === 0 ? (
                <div className="text-xs py-2" style={{ color: '#B8A888' }}>{t('cal.noShiftsScheduled')}</div>
              ) : (
                <div className="space-y-1.5">
                  {dayShifts.map(s => (
                    <ShiftRow key={s.id} shift={s} colony={colonyById[s.colonyId]}
                              assignee={memberById[s.assigneeId]}
                              onClick={() => onSelectShift(s)} showDate={false} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <LegendRow />
    </div>
  );
};

export const MyShiftsView = ({ shifts, members, colonies, currentUser, currentRole, onSelectShift }) => {
  const { t } = useTranslation();
  const memberById = Object.fromEntries(members.map(m => [m.userId, m]));
  const colonyById = Object.fromEntries(colonies.map(c => [c.id, c]));

  const mine = shifts.filter(s => s.assigneeId === currentUser?.id && s.status !== 'done').slice(0, 30);
  const recent = shifts.filter(s => s.assigneeId === currentUser?.id && s.status === 'done')
                       .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const canClaim = can(currentRole, 'claim_shift');
  const open = canClaim ? shifts.filter(s => s.status === 'open' && !isShiftPast(s)).slice(0, 30) : [];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-serif text-lg mb-3" style={{ color: '#1A1712' }}>{t('cal.mine.upcoming')}</h3>
        {mine.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t('cal.mine.empty')}
                      description={canClaim ? t('cal.mine.emptyClaim') : t('cal.mine.emptyWait')} />
        ) : (
          <div className="space-y-1.5">
            {mine.map(s => (
              <ShiftRow key={s.id} shift={s} colony={colonyById[s.colonyId]}
                        assignee={memberById[s.assigneeId]}
                        onClick={() => onSelectShift(s)} />
            ))}
          </div>
        )}
      </section>

      {canClaim && open.length > 0 && (
        <section>
          <h3 className="font-serif text-lg mb-3" style={{ color: '#1A1712' }}>{t('cal.mine.openShifts')}</h3>
          <div className="space-y-1.5">
            {open.map(s => (
              <ShiftRow key={s.id} shift={s} colony={colonyById[s.colonyId]}
                        assignee={memberById[s.assigneeId]}
                        onClick={() => onSelectShift(s)} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h3 className="font-serif text-lg mb-3" style={{ color: '#1A1712' }}>{t('cal.mine.recentDone')}</h3>
          <div className="space-y-1.5">
            {recent.map(s => (
              <ShiftRow key={s.id} shift={s} colony={colonyById[s.colonyId]}
                        assignee={memberById[s.assigneeId]}
                        onClick={() => onSelectShift(s)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const TemplatesView = ({ templates, colonies, currentRole, onAdd, onEdit }) => {
  const { t } = useTranslation();
  const byColony = {};
  // OJO: usamos `tpl` para el loop, no `t` — colisiona con la función de
  // traducción del hook.
  for (const tpl of templates) (byColony[tpl.colonyId] ||= []).push(tpl);
  const canManage = can(currentRole, 'manage_shifts');

  return (
    <div>
      {canManage && (
        <div className="flex justify-end mb-4">
          <button onClick={onAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            <Plus className="w-4 h-4" /> {t('cal.newTemplate')}
          </button>
        </div>
      )}
      {templates.length === 0 ? (
        <EmptyState icon={Repeat} title={t('cal.tpl.empty')}
                    description={t('cal.tpl.emptyDesc')}
                    action={canManage ? <button onClick={onAdd}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
                      <Plus className="w-4 h-4" /> {t('cal.tpl.createFirst')}
                    </button> : null} />
      ) : (
        <div className="space-y-5">
          {colonies.filter(c => byColony[c.id]?.length).map(c => (
            <div key={c.id}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: '#8A7A5C' }} />
                <h3 className="font-serif text-base" style={{ color: '#1A1712' }}>{c.name}</h3>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#8A7A5C' }}>
                  {byColony[c.id].length} {t(byColony[c.id].length === 1 ? 'cal.tpl.countOne' : 'cal.tpl.countMany')}
                </span>
              </div>
              <div className="space-y-1.5">
                {byColony[c.id].map(tpl => {
                  const task = SHIFT_TASKS[tpl.task];
                  const Icon = task.icon;
                  const daysStr = tpl.daysOfWeek.length === 7
                    ? t('cal.tpl.allDaysShort')
                    : tpl.daysOfWeek.map(n => t(`day.${n}.short`)).join(' · ');
                  const tplSlot = tpl.slot || slotFromTime(tpl.time);
                  return (
                    <button key={tpl.id} onClick={() => canManage && onEdit(tpl)}
                            disabled={!canManage}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                            style={{
                              backgroundColor: '#FDFAF3',
                              boxShadow: '0 0 0 1px #EADFC9',
                              opacity: tpl.active ? 1 : 0.55,
                              cursor: canManage ? 'pointer' : 'default',
                            }}>
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ backgroundColor: task.bg }}>
                        <Icon className="w-5 h-5" style={{ color: task.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium" style={{ color: '#1A1712' }}>{t(`task.${tpl.task}.label`)}</span>
                          {!tpl.active && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F2EADB', color: '#8A7A5C' }}>{t('cal.tpl.inactive')}</span>}
                        </div>
                        <div className="text-xs flex items-center gap-2 flex-wrap" style={{ color: '#78706A' }}>
                          <span className="font-medium">{tplSlot ? t(`slot.${tplSlot}.label`) : ''}</span>
                          <span>· {daysStr}</span>
                        </div>
                      </div>
                      {canManage && <Edit3 className="w-4 h-4 flex-shrink-0" style={{ color: '#B8A888' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DayListModal = ({ date, shifts, colonies, members, onSelectShift, onClose }) => {
  const { t } = useTranslation();
  const colonyById = Object.fromEntries(colonies.map(c => [c.id, c]));
  const memberById = Object.fromEntries(members.map(m => [m.userId, m]));
  return (
    <div className="space-y-2">
      <div className="text-xs mb-3 capitalize" style={{ color: '#78706A' }}>{fmtDayLong(date)}</div>
      {shifts.length === 0 ? (
        <div className="text-sm py-6 text-center" style={{ color: '#B8A888' }}>{t('cal.dayNoShifts')}</div>
      ) : (
        shifts.map(s => (
          <ShiftRow key={s.id} shift={s} colony={colonyById[s.colonyId]}
                    assignee={memberById[s.assigneeId]}
                    onClick={() => { onSelectShift(s); }} showDate={false} />
        ))
      )}
    </div>
  );
};

// Contenedor principal del calendario
export const CalendarView = ({ templates, shifts, colonies, members, users, currentUser, currentRole,
                       onSelectShift, onAddTemplate, onEditTemplate, initialTab = 'month' }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(initialTab);
  const [cursor, setCursor] = useState(new Date());
  const [colonyFilter, setColonyFilter] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');

  // Rango a materializar según la vista
  let rangeFrom, rangeTo;
  if (tab === 'month') {
    rangeFrom = startOfWeek(startOfMonth(cursor));
    rangeTo = addDays(rangeFrom, 41);
  } else if (tab === 'week') {
    rangeFrom = startOfWeek(cursor);
    rangeTo = addDays(rangeFrom, 6);
  } else {
    // mine: próximas 4 semanas
    rangeFrom = new Date(); rangeFrom.setHours(0,0,0,0);
    rangeFrom = addDays(rangeFrom, -14); // para incluir recientes completados
    rangeTo = addDays(rangeFrom, 42);
  }

  const colonyIds = colonyFilter === 'all' ? null : new Set([colonyFilter]);
  let allShifts = computeShifts({ templates, shifts, colonyIds, from: rangeFrom, to: rangeTo });
  if (taskFilter !== 'all') allShifts = allShifts.filter(s => s.task === taskFilter);

  // Lista enriquecida para resolver assignees/completedBy: miembros reales de
  // la org + perfiles globales (users) como fallback. Usuarios "de paso" como
  // un super_admin que asigna turnos sin ser miembro siguen siendo localizables
  // por nombre y avatar. members tiene prioridad porque trae el rol.
  const memberKeyed = members.map(m => [m.userId, m]);
  const userKeyed = (users || []).map(u => [u.id, { ...u, userId: u.id }]);
  // Object.fromEntries: las entradas posteriores ganan, así que members
  // sobrescribe a users cuando coinciden los ids.
  const allKnown = Object.values(Object.fromEntries([...userKeyed, ...memberKeyed]));

  const tabs = [
    { key: 'month',     labelKey: 'cal.tab.month',     icon: CalendarDays },
    { key: 'week',      labelKey: 'cal.tab.week',      icon: Calendar },
    { key: 'mine',      labelKey: 'cal.tab.mine',      icon: UserCheck },
    { key: 'templates', labelKey: 'cal.tab.templates', icon: Repeat },
  ];

  const canManage = can(currentRole, 'manage_shifts');
  const availableColonies = colonyFilter === 'all' ? colonies : colonies.filter(c => c.id === colonyFilter);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-serif text-3xl mb-1" style={{ color: '#1A1712' }}>{t('cal.title')}</h1>
          <p className="text-sm" style={{ color: '#78706A' }}>{t('cal.subtitle')}</p>
        </div>
        {canManage && tab !== 'templates' && (
          <button onClick={onAddTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            <Plus className="w-4 h-4" /> {t('cal.newTemplate')}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                  style={{
                    backgroundColor: tab === key ? '#1F3A2F' : '#F2EADB',
                    color: tab === key ? '#F8F3E8' : '#4A433C',
                  }}>
            <Icon className="w-4 h-4" /> {t(labelKey)}
          </button>
        ))}
      </div>

      {tab !== 'templates' && tab !== 'mine' && (
        <CalendarFilters colonies={colonies} colonyFilter={colonyFilter} setColonyFilter={setColonyFilter}
                         taskFilter={taskFilter} setTaskFilter={setTaskFilter} />
      )}

      {tab === 'month' && (
        <MonthView cursor={cursor} setCursor={setCursor} shifts={allShifts} members={allKnown}
                   onSelectShift={onSelectShift}
                   onSelectDay={(d) => {
                     setCursor(d);
                     setTab('week');
                   }} />
      )}
      {tab === 'week' && (
        <WeekView cursor={cursor} setCursor={setCursor} shifts={allShifts} members={allKnown}
                  colonies={availableColonies} onSelectShift={onSelectShift} />
      )}
      {tab === 'mine' && (
        <MyShiftsView shifts={allShifts} members={allKnown} colonies={colonies}
                      currentUser={currentUser} currentRole={currentRole}
                      onSelectShift={onSelectShift} />
      )}
      {tab === 'templates' && (
        <TemplatesView templates={templates.filter(t => colonyFilter === 'all' || t.colonyId === colonyFilter)}
                       colonies={colonies} currentRole={currentRole}
                       onAdd={onAddTemplate} onEdit={onEditTemplate} />
      )}
    </div>
  );
};
