// Todo lo relacionado con fichas de gatos: tarjeta, lista, ficha detallada,
// formulario de alta/edición y formulario de eventos veterinarios.

import { useState, useRef, useEffect } from 'react';
import {
  MapPin, Plus, Search, ChevronLeft, ChevronRight, Edit3, Trash2,
  PawPrint, Camera, Check, Stethoscope, X as XIcon,
  Bell, CheckCircle2, RotateCcw, AlertCircle,
} from 'lucide-react';
import { fmtDate, parseYmd, todayYmd } from '../lib/dates.js';
import { CER_STATUS, SEX_VALUES, EVENT_TYPES } from '../constants.js';
import { CatAvatar, StatusBadge, SexBadge, FilterPill, EmptyState, Field } from './ui.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';
import { useTranslation } from '../lib/i18n.jsx';

export const CatCard = ({ cat, onSelect, colonyName }) => (
  <button onClick={onSelect}
          className="text-left p-4 rounded-2xl transition-all hover:translate-y-[-2px] flex items-center gap-3"
          style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
    <CatAvatar cat={cat} size={56} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-serif text-lg truncate" style={{ color: '#1A1712' }}>{cat.name}</h3>
        <SexBadge sex={cat.sex} />
      </div>
      <div className="text-xs truncate mb-1.5" style={{ color: '#78706A' }}>{cat.color}{colonyName ? ` · ${colonyName}` : ''}</div>
      <StatusBadge status={cat.cerStatus} size="sm" />
    </div>
  </button>
);

export const CatsView = ({ cats, colonies, onSelect, onAdd, filter, setFilter }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [colonyFilter, setColonyFilter] = useState('all');
  const coloniesById = Object.fromEntries(colonies.map(c => [c.id, c]));

  // El filtro de colonia se aplica primero: así las píldoras de estado CER
  // reflejan recuentos dentro de la colonia seleccionada, no del total global.
  const byColony = colonyFilter === 'all'
    ? cats
    : cats.filter(c => c.colonyId === colonyFilter);

  const filtered = byColony.filter(c => {
    if (filter !== 'all' && c.cerStatus !== filter) return false;
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.color || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>{t('cats.kicker')}</div>
          <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1712' }}>{t('cats.title')}</h1>
        </div>
        <button onClick={onAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          <Plus className="w-4 h-4" /> {t('cats.newCat')}
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A7A5C' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                 placeholder={t('cats.searchPh')}
                 className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
                 style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#1A1712' }} />
        </div>
        {colonies.length >= 2 && (
          <div className="relative min-w-[200px]">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#8A7A5C' }} />
            <select value={colonyFilter} onChange={e => setColonyFilter(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#1A1712' }}>
              <option value="all">{t('cal.allColonies')}</option>
              {colonies.map(col => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} count={byColony.length}>{t('cats.filterAll')}</FilterPill>
        {Object.entries(CER_STATUS).map(([key, val]) => {
          const n = byColony.filter(c => c.cerStatus === key).length;
          if (n === 0) return null;
          return (
            <FilterPill key={key} active={filter === key} onClick={() => setFilter(key)} count={n} dotColor={val.dot}>
              {t(`cer.${key}.short`)}
            </FilterPill>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={PawPrint} title={t('cats.emptyResults')}
                    description={
                      colonyFilter !== 'all'
                        ? t('cats.emptyResultsInColony', { name: coloniesById[colonyFilter]?.name || '' })
                        : t('cats.emptyResultsGeneric')
                    } />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(cat => (
            <CatCard key={cat.id} cat={cat} colonyName={coloniesById[cat.colonyId]?.name} onSelect={() => onSelect(cat.id)} />
          ))}
        </div>
      )}
    </div>
  );
};

export const CatDetail = ({
  cat, colony, events, reminders = [], members = [],
  onBack, onEdit, onAddEvent, onEditEvent, onDelete, onChangeStatus,
  onAddReminder, onEditReminder, onDeleteReminder, onCompleteReminder, onUncompleteReminder,
  canEdit = true, canDelete = true, canAddEvent = true, canEditEvent = true, canChangeStatus = true,
  canManageReminders = true, canDeleteReminders = true,
}) => {
  const { t } = useTranslation();
  const [statusMenu, setStatusMenu] = useState(false);
  const [showCompletedReminders, setShowCompletedReminders] = useState(false);
  // Pestaña activa de la zona inferior: recordatorios o historial veterinario.
  const [detailTab, setDetailTab] = useState('reminders');
  const catEvents = events.filter(e => e.catId === cat.id).sort((a,b) => b.date - a.date);
  const status = CER_STATUS[cat.cerStatus] || CER_STATUS.pendiente;
  const statusLabel = t(`cer.${cat.cerStatus}.label`);

  // Recordatorios del gato. Los pendientes (completed_at = null) van
  // arriba, ordenados por fecha. Los completados se cuelgan al final, ocultos
  // por defecto detrás de un toggle, para no enterrar lo pendiente.
  const catReminders = reminders.filter(r => r.catId === cat.id);
  const pendingReminders = catReminders
    .filter(r => !r.completedAt)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completedReminders = catReminders
    .filter(r => r.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt);

  const memberById = Object.fromEntries(members.map(m => [m.userId, m]));

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#4A433C' }}>
        <ChevronLeft className="w-4 h-4" /> {t('common.back')}
      </button>

      <div className="grid md:grid-cols-[280px,1fr] gap-6">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden relative"
               style={{ backgroundColor: status.bg }}>
            {cat.photoUrl ? (
              <img src={cat.photoUrl} alt={cat.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif" style={{ color: status.color, fontSize: 96 }}>
                {cat.name.slice(0,1).toUpperCase()}
              </div>
            )}
          </div>
          {(canEdit || canDelete) && (
            <div className="flex gap-2 mt-3">
              {canEdit && (
                <button onClick={onEdit} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
                        style={{ backgroundColor: '#F2EADB', color: '#2D4A3E' }}>
                  <Edit3 className="w-4 h-4" /> {t('catDetail.editCardBtn')}
                </button>
              )}
              {canDelete && (
                <button onClick={onDelete} className="p-2 rounded-xl" style={{ backgroundColor: '#F2EADB', color: '#B15A3A' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>{t('catDetail.kicker')}</div>
          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <h1 className="font-serif text-5xl" style={{ color: '#1A1712' }}>{cat.name}</h1>
            <SexBadge sex={cat.sex} size="lg" />
          </div>

          <div className="relative inline-block">
            <button onClick={() => canChangeStatus && setStatusMenu(v => !v)}
                    disabled={!canChangeStatus}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium disabled:cursor-default"
                    style={{ backgroundColor: status.bg, color: status.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.dot }} />
              {statusLabel}
              {canChangeStatus && <ChevronRight className="w-3.5 h-3.5 rotate-90" />}
            </button>
            {statusMenu && canChangeStatus && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
                <div className="absolute left-0 top-full mt-2 z-20 rounded-xl py-1.5 min-w-[200px]"
                     style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(42,37,32,0.12), 0 0 0 1px #EADFC9' }}>
                  {Object.entries(CER_STATUS).map(([key, val]) => (
                    <button key={key} onClick={() => { onChangeStatus(key); setStatusMenu(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3] inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: val.dot }} />
                      <span style={{ color: '#1A1712' }}>{t(`cer.${key}.label`)}</span>
                      {cat.cerStatus === key && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: '#6B8E4E' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            <Field label={t('catDetail.field.colony')} value={colony?.name || '—'} />
            <Field label={t('catDetail.field.age')} value={cat.age || '—'} />
            <Field label={t('catDetail.field.color')} value={cat.color || '—'} />
            <Field label={t('catDetail.field.microchip')} value={cat.microchip ? <span className="font-mono text-xs">{cat.microchip}</span> : '—'} />
            <Field label={t('catDetail.field.signs')} value={cat.signs || '—'} wide />
          </dl>

          {cat.notes && (
            <div className="mt-6 pt-5 border-t" style={{ borderColor: '#F0E8D6' }}>
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>{t('catDetail.notesLabel')}</div>
              <p className="text-sm leading-relaxed" style={{ color: '#4A433C' }}>{cat.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Zona inferior en pestañas: recordatorios | historial veterinario.
          Evita el scroll interminable cuando ambas listas son largas. */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setDetailTab('reminders')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: detailTab === 'reminders' ? '#1F3A2F' : '#FDFAF3',
                      color: detailTab === 'reminders' ? '#F8F3E8' : '#4A433C',
                      boxShadow: detailTab === 'reminders' ? 'none' : '0 0 0 1px #EADFC9',
                    }}>
              <Bell className="w-4 h-4" /> {t('catDetail.reminders')}
              <span className="font-mono" style={{ opacity: 0.7 }}>{catReminders.length}</span>
            </button>
            <button onClick={() => setDetailTab('history')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: detailTab === 'history' ? '#1F3A2F' : '#FDFAF3',
                      color: detailTab === 'history' ? '#F8F3E8' : '#4A433C',
                      boxShadow: detailTab === 'history' ? 'none' : '0 0 0 1px #EADFC9',
                    }}>
              <Stethoscope className="w-4 h-4" /> {t('catDetail.history')}
              <span className="font-mono" style={{ opacity: 0.7 }}>{catEvents.length}</span>
            </button>
          </div>
          {detailTab === 'reminders' && canManageReminders && (
            <button onClick={onAddReminder}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#F2EADB', color: '#2D4A3E' }}>
              <Plus className="w-4 h-4" /> {t('catDetail.addReminder')}
            </button>
          )}
          {detailTab === 'history' && canAddEvent && (
            <button onClick={onAddEvent}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#F2EADB', color: '#2D4A3E' }}>
              <Plus className="w-4 h-4" /> {t('catDetail.addEvent')}
            </button>
          )}
        </div>

        {detailTab === 'reminders' && (
        <div>
        {pendingReminders.length === 0 && completedReminders.length === 0 ? (
          <div className="rounded-xl p-4 text-sm text-center"
               style={{ backgroundColor: '#FDFAF3', color: '#78706A', boxShadow: '0 0 0 1px #EADFC9' }}>
            {t('catDetail.emptyReminders')}
          </div>
        ) : (
          <div className="space-y-2">
            {pendingReminders.map(r => {
              const evType = EVENT_TYPES[r.type] || { icon: Bell, color: '#6B635A' };
              const typeLabel = EVENT_TYPES[r.type] ? t(`event.${r.type}.label`) : t('catDetail.otherType');
              const Icon = evType.icon;
              const today = todayYmd();
              const overdue = r.dueDate < today;
              const dueTone = overdue
                ? { bg: '#F5DDCE', accent: '#B15A3A', label: t('dash.reminders.overdue') }
                : r.dueDate === today
                  ? { bg: '#FDF4DE', accent: '#8A6B1F', label: t('dash.reminders.today') }
                  : { bg: '#FDFAF3', accent: '#4A6332', label: null };
              return (
                <div key={r.id} className="rounded-xl p-3 flex items-start gap-3"
                     style={{ backgroundColor: dueTone.bg, boxShadow: `0 0 0 1px ${overdue ? '#F5C6AE' : '#EADFC9'}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ backgroundColor: '#FDFAF3' }}>
                    <Icon className="w-4 h-4" style={{ color: evType.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: '#1A1712' }}>
                        {r.title || typeLabel}
                      </span>
                      {dueTone.label && (
                        <span className="text-[10px] uppercase tracking-wider font-medium"
                              style={{ color: dueTone.accent }}>
                          {dueTone.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#78706A' }}>
                      {!r.title && typeLabel !== r.title && <span className="mr-1">{typeLabel} ·</span>}
                      {fmtDate(parseYmd(r.dueDate))}
                    </div>
                    {r.notes && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: '#4A433C' }}>{r.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canManageReminders && (
                      <button onClick={() => onCompleteReminder(r.id)}
                              title={t('catDetail.rem.markDone')}
                              className="p-1.5 rounded-lg hover:bg-white"
                              style={{ color: '#4A6332' }}>
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {canManageReminders && (
                      <button onClick={() => onEditReminder(r)}
                              title={t('common.edit')}
                              className="p-1.5 rounded-lg hover:bg-white"
                              style={{ color: '#4A433C' }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDeleteReminders && (
                      <button onClick={() => onDeleteReminder(r.id)}
                              title={t('common.delete')}
                              className="p-1.5 rounded-lg hover:bg-white"
                              style={{ color: '#B15A3A' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {completedReminders.length > 0 && (
              <div className="pt-2">
                <button onClick={() => setShowCompletedReminders(v => !v)}
                        className="text-xs font-medium inline-flex items-center gap-1.5"
                        style={{ color: '#8A7A5C' }}>
                  <ChevronRight className="w-3 h-3 transition-transform"
                                style={{ transform: showCompletedReminders ? 'rotate(90deg)' : 'none' }} />
                  {showCompletedReminders
                    ? t('catDetail.rem.hideCompleted', { n: completedReminders.length })
                    : t('catDetail.rem.showCompleted', { n: completedReminders.length })}
                </button>
                {showCompletedReminders && (
                  <div className="space-y-2 mt-2">
                    {completedReminders.map(r => {
                      const evType = EVENT_TYPES[r.type] || { icon: Bell, color: '#6B635A' };
                      const typeLabel = EVENT_TYPES[r.type] ? t(`event.${r.type}.label`) : t('catDetail.otherType');
                      const Icon = evType.icon;
                      const completedByName = memberById[r.completedBy]?.name || null;
                      return (
                        <div key={r.id} className="rounded-xl p-3 flex items-start gap-3 opacity-75"
                             style={{ backgroundColor: '#DDE6CC', boxShadow: '0 0 0 1px #C3CFB1' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                               style={{ backgroundColor: '#FDFAF3' }}>
                            <Icon className="w-4 h-4" style={{ color: evType.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium line-through" style={{ color: '#4A6332' }}>
                              {r.title || typeLabel}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: '#4A6332' }}>
                              {completedByName
                                ? t('catDetail.rem.completedBy', { date: fmtDate(r.completedAt), name: completedByName })
                                : t('catDetail.rem.completedNoBy', { date: fmtDate(r.completedAt) })}
                            </div>
                          </div>
                          {canManageReminders && (
                            <button onClick={() => onUncompleteReminder(r.id)}
                                    title={t('catDetail.rem.undo')}
                                    className="p-1.5 rounded-lg hover:bg-white flex-shrink-0"
                                    style={{ color: '#4A6332' }}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
        )}

        {detailTab === 'history' && (
        <div>
        {catEvents.length === 0 ? (
          <EmptyState icon={Stethoscope} title={t('catDetail.emptyEvents')} description={t('catDetail.emptyEventsDesc')}
                      action={canAddEvent ? <button onClick={onAddEvent} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('catDetail.firstEvent')}</button> : null} />
        ) : (
          <ol className="relative" style={{ borderLeft: '2px solid #E8DFCE', marginLeft: 16 }}>
            {catEvents.map(ev => {
              const type = EVENT_TYPES[ev.type];
              const Icon = type?.icon || Stethoscope;
              const evLabel = type ? t(`event.${ev.type}.label`) : t('catDetail.eventFallback');
              return (
                <li key={ev.id} className="relative pl-8 pb-6 last:pb-0">
                  <div className="absolute -left-[18px] w-8 h-8 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 2px #E8DFCE' }}>
                    <Icon className="w-4 h-4" style={{ color: type?.color || '#6B635A' }} />
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
                    <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                      <h4 className="font-serif text-lg" style={{ color: '#1A1712' }}>{evLabel}</h4>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs font-mono" style={{ color: '#8A7A5C' }}>{fmtDate(ev.date)}</span>
                        {canEditEvent && (
                          <button onClick={() => onEditEvent(ev)}
                                  title={t('common.edit')}
                                  className="p-1 rounded-lg hover:bg-white"
                                  style={{ color: '#4A433C' }}>
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {ev.vet && ev.vet !== '-' && <div className="text-xs mb-1.5" style={{ color: '#78706A' }}>{ev.vet}</div>}
                    {ev.notes && <p className="text-sm leading-relaxed" style={{ color: '#4A433C' }}>{ev.notes}</p>}
                    {ev.cost > 0 && <div className="mt-2 text-xs font-mono" style={{ color: '#8A7A5C' }}>{ev.cost.toFixed(2)} €</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        </div>
        )}
      </div>
    </div>
  );
};

export const CatForm = ({ cat, colonies, onSave, onCancel, onError }) => {
  const { t } = useTranslation();
  // Modelo de la foto en el form:
  //   - photoUrl: URL pública guardada en BD (existente o null si no hay).
  //   - photoFile: File pendiente de subir (solo en memoria, null si no hay).
  // El upload real se hace en saveCat al confirmar el form; aquí mostramos
  // un preview local con createObjectURL para feedback inmediato.
  const [form, setForm] = useState(cat ? { ...cat, photoFile: null } : {
    name: '', sex: 'D', color: '', colonyId: colonies[0]?.id || '',
    cerStatus: 'pendiente', age: '', microchip: '', signs: '', notes: '',
    photoUrl: null, photoFile: null,
  });
  const fileRef = useRef(null);

  // Preview local del File pendiente. Se revoca al cambiar de archivo o
  // al desmontar para no acumular URLs en memoria.
  const [photoPreview, setPhotoPreview] = useState(null);
  useEffect(() => {
    if (!form.photoFile) { setPhotoPreview(null); return; }
    const objUrl = URL.createObjectURL(form.photoFile);
    setPhotoPreview(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [form.photoFile]);

  const displayedPhoto = photoPreview || form.photoUrl || null;

  const handlePhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Validación básica: tamaño máximo antes de comprimir, evita procesar
    // archivos absurdos. 10 MB ya es generoso para fotos de móvil.
    if (f.size > 10 * 1024 * 1024) {
      const msg = { title: t('catForm.photoTooBig.title'), message: t('catForm.photoTooBig.msg') };
      if (onError) onError(msg); else alert(msg.message);
      return;
    }
    setForm({ ...form, photoFile: f });
  };

  const removePhoto = () => {
    setForm({ ...form, photoFile: null, photoUrl: null });
    if (fileRef.current) fileRef.current.value = '';
  };

  const valid = form.name.trim() && form.colonyId;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden"
               style={{ backgroundColor: '#F2EADB' }}>
            {displayedPhoto ? (
              <img src={displayedPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-7 h-7" style={{ color: '#B8A888' }} />
              </div>
            )}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
                  title={displayedPhoto ? t('catForm.changePhoto') : t('catForm.addPhoto')}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            <Camera className="w-4 h-4" />
          </button>
          {displayedPhoto && (
            <button type="button" onClick={removePhoto}
                    title={t('catForm.removePhoto')}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#B15A3A', color: '#F8F3E8' }}>
              <XIcon className="w-3 h-3" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.nameLabel')}</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                   placeholder={t('catForm.namePh')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.sexLabel')}</label>
              <select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                {SEX_VALUES.map((k) => <option key={k} value={k}>{t(`sex.${k}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.ageLabel')}</label>
              <input type="text" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                     className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                     placeholder={t('catForm.agePh')} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.colonyLabel')}</label>
        <select value={form.colonyId} onChange={e => setForm({ ...form, colonyId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.cerLabel')}</label>
        <select value={form.cerStatus} onChange={e => setForm({ ...form, cerStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          {Object.keys(CER_STATUS).map((k) => <option key={k} value={k}>{t(`cer.${k}.label`)}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.colorLabel')}</label>
        <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('catForm.colorPh')} />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.signsLabel')}</label>
        <input type="text" value={form.signs} onChange={e => setForm({ ...form, signs: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('catForm.signsPh')} />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.microchipLabel')}</label>
        <input type="text" value={form.microchip} onChange={e => setForm({ ...form, microchip: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}
               placeholder="981000000000000" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('catForm.notesLabel')}</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder={t('catForm.notesPh')} />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('common.cancel')}</button>
        <button onClick={() => valid && onSave(form)} disabled={!valid}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('common.save')}</button>
      </div>
    </div>
  );
};

export const EventForm = ({ event, onSave, onCancel }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  // En edición precargamos desde el evento: la fecha (ms) se pasa a 'YYYY-MM-DD'
  // para el input date, y el coste a string para el input numérico.
  const [form, setForm] = useState(event
    ? {
        id: event.id,
        type: event.type,
        date: new Date(event.date).toISOString().slice(0, 10),
        vet: event.vet && event.vet !== '-' ? event.vet : '',
        cost: event.cost === null || event.cost === undefined ? '' : String(event.cost),
        notes: event.notes || '',
      }
    : { type: 'vacunacion', date: today, vet: '', cost: '', notes: '' }
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>{t('eventForm.typeLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(EVENT_TYPES).map(([k, v]) => {
            const Icon = v.icon;
            const active = form.type === k;
            return (
              <button key={k} onClick={() => setForm({ ...form, type: k })}
                      className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active ? v.color : '#FFFFFF',
                        color: active ? '#FDFAF3' : '#4A433C',
                        boxShadow: active ? 'none' : '0 0 0 1px #EADFC9'
                      }}>
                <Icon className="w-4 h-4" /> {t(`event.${k}.label`)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('eventForm.dateLabel')}</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('eventForm.costLabel')}</label>
          <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('eventForm.vetLabel')}</label>
        <input type="text" value={form.vet} onChange={e => setForm({ ...form, vet: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('eventForm.vetPh')} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('eventForm.notesLabel')}</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder={t('eventForm.notesPh')} />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('common.cancel')}</button>
        <button onClick={() => onSave({
          ...form,
          date: new Date(form.date).getTime(),
          cost: parseFloat(form.cost) || 0
        })}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('common.save')}</button>
      </div>
    </div>
  );
};

// Formulario para crear/editar un recordatorio médico de un gato.
// El selector de tipo reutiliza EVENT_TYPES para mantener vocabulario único:
// los recordatorios son "lo que toca de tipo X", se completan registrando un
// event del mismo tipo cuando aplica.
export const ReminderForm = ({ reminder, onSave, onCancel }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(reminder
    ? { id: reminder.id, type: reminder.type, dueDate: reminder.dueDate, title: reminder.title || '', notes: reminder.notes || '' }
    : { type: 'vacunacion', dueDate: today, title: '', notes: '' }
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy || !form.dueDate) return;
    setBusy(true);
    await onSave(form);
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>{t('reminderForm.typeLabel')}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(EVENT_TYPES).map(([k, v]) => {
            const Icon = v.icon;
            const active = form.type === k;
            return (
              <button key={k} type="button" onClick={() => setForm({ ...form, type: k })}
                      className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor: active ? v.color : '#FFFFFF',
                        color: active ? '#FDFAF3' : '#4A433C',
                        boxShadow: active ? 'none' : '0 0 0 1px #EADFC9'
                      }}>
                <Icon className="w-4 h-4" /> {t(`event.${k}.label`)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('reminderForm.dueDateLabel')}</label>
        <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>
          {t('reminderForm.titleLabel')} <span style={{ color: '#8A7A5C' }}>{t('common.optional')}</span>
        </label>
        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('reminderForm.titlePh')} />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>
          {t('reminderForm.notesLabel')} <span style={{ color: '#8A7A5C' }}>{t('common.optional')}</span>
        </label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder={t('reminderForm.notesPh')} />
      </div>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>{t('common.cancel')}</button>
        <button type="button" onClick={submit} disabled={busy || !form.dueDate}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {busy ? t('reminderForm.saving') : t('reminderForm.save')}
        </button>
      </div>
    </div>
  );
};
