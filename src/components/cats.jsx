// Todo lo relacionado con fichas de gatos: tarjeta, lista, ficha detallada,
// formulario de alta/edición y formulario de eventos veterinarios.

import { useState, useRef } from 'react';
import {
  MapPin, Plus, Search, ChevronLeft, ChevronRight, Edit3, Trash2,
  PawPrint, Camera, Check, Stethoscope,
} from 'lucide-react';
import { resizeImage } from '../lib/images.js';
import { fmtDate } from '../lib/dates.js';
import { CER_STATUS, SEX_OPTIONS, EVENT_TYPES } from '../constants.js';
import { CatAvatar, StatusBadge, FilterPill, EmptyState, Field } from './ui.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';

export const CatCard = ({ cat, onSelect, colonyName }) => (
  <button onClick={onSelect}
          className="text-left p-4 rounded-2xl transition-all hover:translate-y-[-2px] flex items-center gap-3"
          style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
    <CatAvatar cat={cat} size={56} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-serif text-lg truncate" style={{ color: '#1A1712' }}>{cat.name}</h3>
        <span className="text-xs font-mono" style={{ color: '#B8A888' }}>{cat.sex}</span>
      </div>
      <div className="text-xs truncate mb-1.5" style={{ color: '#78706A' }}>{cat.color}{colonyName ? ` · ${colonyName}` : ''}</div>
      <StatusBadge status={cat.cerStatus} size="sm" />
    </div>
  </button>
);

export const CatsView = ({ cats, colonies, onSelect, onAdd, filter, setFilter }) => {
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
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>Censo</div>
          <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1712' }}>Gatos</h1>
        </div>
        <button onClick={onAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          <Plus className="w-4 h-4" /> Nuevo gato
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A7A5C' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Buscar por nombre o color…"
                 className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
                 style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#1A1712' }} />
        </div>
        {colonies.length >= 2 && (
          <div className="relative min-w-[200px]">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#8A7A5C' }} />
            <select value={colonyFilter} onChange={e => setColonyFilter(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#1A1712' }}>
              <option value="all">Todas las colonias</option>
              {colonies.map(col => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} count={byColony.length}>Todos</FilterPill>
        {Object.entries(CER_STATUS).map(([key, val]) => {
          const n = byColony.filter(c => c.cerStatus === key).length;
          if (n === 0) return null;
          return (
            <FilterPill key={key} active={filter === key} onClick={() => setFilter(key)} count={n} dotColor={val.dot}>
              {val.short}
            </FilterPill>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={PawPrint} title="Sin resultados"
                    description={
                      colonyFilter !== 'all'
                        ? `No hay gatos en "${coloniesById[colonyFilter]?.name || ''}" que coincidan con los filtros.`
                        : 'No hay gatos que coincidan con esta búsqueda o filtro.'
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

export const CatDetail = ({ cat, colony, events, onBack, onEdit, onAddEvent, onDelete, onChangeStatus, canEdit = true, canDelete = true, canAddEvent = true, canChangeStatus = true }) => {
  const [statusMenu, setStatusMenu] = useState(false);
  const catEvents = events.filter(e => e.catId === cat.id).sort((a,b) => b.date - a.date);
  const status = CER_STATUS[cat.cerStatus] || CER_STATUS.pendiente;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#4A433C' }}>
        <ChevronLeft className="w-4 h-4" /> Volver
      </button>

      <div className="grid md:grid-cols-[280px,1fr] gap-6">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden relative"
               style={{ backgroundColor: status.bg }}>
            {cat.photo ? (
              <img src={cat.photo} alt={cat.name} className="w-full h-full object-cover" />
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
                  <Edit3 className="w-4 h-4" /> Editar ficha
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
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>Ficha individual</div>
          <div className="flex items-baseline gap-3 flex-wrap mb-3">
            <h1 className="font-serif text-5xl" style={{ color: '#1A1712' }}>{cat.name}</h1>
            <span className="text-lg font-mono" style={{ color: '#B8A888' }}>{cat.sex}</span>
          </div>

          <div className="relative inline-block">
            <button onClick={() => canChangeStatus && setStatusMenu(v => !v)}
                    disabled={!canChangeStatus}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium disabled:cursor-default"
                    style={{ backgroundColor: status.bg, color: status.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.dot }} />
              {status.label}
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
                      <span style={{ color: '#1A1712' }}>{val.label}</span>
                      {cat.cerStatus === key && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: '#6B8E4E' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mt-6">
            <Field label="Colonia" value={colony?.name || '—'} />
            <Field label="Edad estimada" value={cat.age || '—'} />
            <Field label="Color / pelaje" value={cat.color || '—'} />
            <Field label="Microchip" value={cat.microchip ? <span className="font-mono text-xs">{cat.microchip}</span> : '—'} />
            <Field label="Señas identificativas" value={cat.signs || '—'} wide />
          </dl>

          {cat.notes && (
            <div className="mt-6 pt-5 border-t" style={{ borderColor: '#F0E8D6' }}>
              <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>Notas</div>
              <p className="text-sm leading-relaxed" style={{ color: '#4A433C' }}>{cat.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-serif text-2xl" style={{ color: '#1A1712' }}>Historial veterinario</h2>
          {canAddEvent && (
            <button onClick={onAddEvent}
                    className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#F2EADB', color: '#2D4A3E' }}>
              <Plus className="w-4 h-4" /> Añadir evento
            </button>
          )}
        </div>
        {catEvents.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Sin eventos registrados" description="Registra esterilizaciones, vacunaciones, consultas y tratamientos para tener un historial completo."
                      action={canAddEvent ? <button onClick={onAddEvent} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>Primer evento</button> : null} />
        ) : (
          <ol className="relative" style={{ borderLeft: '2px solid #E8DFCE', marginLeft: 16 }}>
            {catEvents.map(ev => {
              const type = EVENT_TYPES[ev.type];
              const Icon = type?.icon || Stethoscope;
              return (
                <li key={ev.id} className="relative pl-8 pb-6 last:pb-0">
                  <div className="absolute -left-[18px] w-8 h-8 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 2px #E8DFCE' }}>
                    <Icon className="w-4 h-4" style={{ color: type?.color || '#6B635A' }} />
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
                    <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                      <h4 className="font-serif text-lg" style={{ color: '#1A1712' }}>{type?.label || 'Evento'}</h4>
                      <span className="text-xs font-mono" style={{ color: '#8A7A5C' }}>{fmtDate(ev.date)}</span>
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
    </div>
  );
};

export const CatForm = ({ cat, colonies, onSave, onCancel, onError }) => {
  const [form, setForm] = useState(cat || {
    name: '', sex: 'D', color: '', colonyId: colonies[0]?.id || '',
    cerStatus: 'pendiente', age: '', microchip: '', signs: '', notes: '', photo: ''
  });
  const fileRef = useRef(null);

  const handlePhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setForm({ ...form, photo: await resizeImage(f, 600) }); }
    catch {
      const msg = { title: 'No se pudo cargar la imagen', message: 'Prueba con otra foto. Si el problema persiste, puede que el archivo esté dañado o sea demasiado grande.' };
      if (onError) onError(msg);
      else alert(msg.message);
    }
  };

  const valid = form.name.trim() && form.colonyId;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl overflow-hidden"
               style={{ backgroundColor: '#F2EADB' }}>
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center"><Camera className="w-7 h-7" style={{ color: '#B8A888' }} /></div>}
          </div>
          <button type="button" onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                   className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                   placeholder="Figa, Pelut, Nit…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Sexo</label>
              <select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
                {Object.entries(SEX_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={labelStyle}>Edad aprox.</label>
              <input type="text" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                     className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
                     placeholder="2 años" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Colonia *</label>
        <select value={form.colonyId} onChange={e => setForm({ ...form, colonyId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          {colonies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Estado CER</label>
        <select value={form.cerStatus} onChange={e => setForm({ ...form, cerStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          {Object.entries(CER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Color / pelaje</label>
        <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="Atigrado marrón, negro pelo largo…" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Señas identificativas</label>
        <input type="text" value={form.signs} onChange={e => setForm({ ...form, signs: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="Oreja recortada, cicatriz, heterocromía…" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Microchip (si tiene)</label>
        <input type="text" value={form.microchip} onChange={e => setForm({ ...form, microchip: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}
               placeholder="981000000000000" />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Notas</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder="Carácter, observaciones, alimentación…" />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>Cancelar</button>
        <button onClick={() => valid && onSave(form)} disabled={!valid}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>Guardar</button>
      </div>
    </div>
  );
};

export const EventForm = ({ onSave, onCancel }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: 'vacunacion', date: today, vet: '', cost: '', notes: '' });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>Tipo de evento</label>
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
                <Icon className="w-4 h-4" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Fecha</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Coste (€)</label>
          <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle} placeholder="0.00" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Veterinario / centro</label>
        <input type="text" value={form.vet} onChange={e => setForm({ ...form, vet: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="Clínica Veterinària…" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Observaciones</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder="Detalles del procedimiento…" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>Cancelar</button>
        <button onClick={() => onSave({
          ...form,
          date: new Date(form.date).getTime(),
          cost: parseFloat(form.cost) || 0
        })}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>Guardar</button>
      </div>
    </div>
  );
};
