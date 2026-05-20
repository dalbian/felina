// Vista y formulario de colonias. ColonyDetail muestra las tarjetas de gato
// dentro de la colonia; de ahí la importación cruzada a cats.jsx (CatCard).

import { useState } from 'react';
import { MapPin, Plus, Search, ChevronLeft, Edit3, Trash2, PawPrint, Locate, Check } from 'lucide-react';
import { fmtRelative } from '../lib/dates.js';
import { EmptyState } from './ui.jsx';
import { CatCard } from './cats.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';
import { useTranslation } from '../lib/i18n.jsx';

export const ColoniesView = ({ colonies, cats, onSelect, onAdd }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const filtered = colonies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>{t('col.kicker')}</div>
          <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1712' }}>{t('col.title')}</h1>
        </div>
        <button onClick={onAdd}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          <Plus className="w-4 h-4" /> {t('col.newColony')}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8A7A5C' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
               placeholder={t('col.searchPh')}
               className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none focus:ring-2"
               style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9', color: '#1A1712' }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MapPin} title={t('col.empty')} description={t('col.emptyDesc')}
                    action={<button onClick={onAdd} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('col.createColony')}</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(col => {
            const colCats = cats.filter(c => c.colonyId === col.id);
            const sterilized = colCats.filter(c => ['esterilizado','en_colonia','en_acogida','adoptado'].includes(c.cerStatus)).length;
            const pct = colCats.length > 0 ? Math.round((sterilized/colCats.length)*100) : 0;
            return (
              <button key={col.id} onClick={() => onSelect(col.id)}
                      className="text-left p-5 rounded-2xl transition-all hover:translate-y-[-2px]"
                      style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: '#DDE6CC' }}>
                    <MapPin className="w-5 h-5" style={{ color: '#4A6332' }} />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: '#8A7A5C' }}>
                    {fmtRelative(col.createdAt)}
                  </span>
                </div>
                <h3 className="font-serif text-xl mb-1" style={{ color: '#1A1712' }}>{col.name}</h3>
                <p className="text-xs mb-4" style={{ color: '#78706A' }}>{col.address}</p>
                <div className="flex items-end justify-between pt-3 border-t" style={{ borderColor: '#F0E8D6' }}>
                  <div>
                    <div className="font-serif text-2xl" style={{ color: '#1A1712' }}>{colCats.length}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: '#8A7A5C' }}>{t('col.cardCats')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-2xl" style={{ color: pct >= 80 ? '#6B8E4E' : pct >= 50 ? '#B89238' : '#C67B5C' }}>{pct}%</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: '#8A7A5C' }}>{t('col.cardCer')}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ColonyDetail = ({ colony, cats, onBack, onSelectCat, onAddCat, onEdit, onDelete, canEdit = true, canDelete = true, canAddCat = true }) => {
  const { t } = useTranslation();
  const colCats = cats.filter(c => c.colonyId === colony.id);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#4A433C' }}>
        <ChevronLeft className="w-4 h-4" /> {t('col.title')}
      </button>

      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
           style={{ backgroundColor: '#2D4A3E', color: '#F5EDD8' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #F5EDD8 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] mb-2 opacity-70">{t('col.detail.kicker')}</div>
              <h1 className="font-serif text-4xl md:text-5xl mb-2">{colony.name}</h1>
              <div className="flex items-center gap-2 text-sm opacity-80">
                <MapPin className="w-4 h-4" /> {colony.address}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex gap-2">
                {canEdit && (
                  <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
                          style={{ backgroundColor: 'rgba(245,237,216,0.15)', color: '#F5EDD8' }}>
                    <Edit3 className="w-4 h-4" /> {t('common.edit')}
                  </button>
                )}
                {canDelete && (
                  <button onClick={onDelete} className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,237,216,0.15)', color: '#F5EDD8' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t" style={{ borderColor: 'rgba(245,237,216,0.2)' }}>
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{t('col.detail.statsCats')}</div>
              <div className="font-serif text-3xl">{colCats.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{t('col.detail.statsSterilized')}</div>
              <div className="font-serif text-3xl">{colCats.filter(c => ['esterilizado','en_colonia','en_acogida','adoptado'].includes(c.cerStatus)).length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">{t('col.detail.statsCarers')}</div>
              <div className="text-sm mt-2">{colony.cuidadores || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {colony.notes && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>{t('col.detail.notesLabel')}</div>
          <p className="text-sm leading-relaxed" style={{ color: '#4A433C' }}>{colony.notes}</p>
        </div>
      )}

      <div>
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-serif text-2xl" style={{ color: '#1A1712' }}>{t('col.detail.catsTitle')}</h2>
          {canAddCat && (
            <button onClick={onAddCat} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: '#F2EADB', color: '#2D4A3E' }}>
              <Plus className="w-4 h-4" /> {t('col.detail.addCat')}
            </button>
          )}
        </div>
        {colCats.length === 0 ? (
          <EmptyState icon={PawPrint} title={t('col.detail.emptyCats')} description={t('col.detail.emptyCatsDesc')}
                      action={canAddCat ? <button onClick={onAddCat} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>{t('col.detail.addFirstCat')}</button> : null} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {colCats.map(cat => <CatCard key={cat.id} cat={cat} onSelect={() => onSelectCat(cat.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export const ColonyForm = ({ colony, onSave, onCancel, fromMap = false }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(colony || { name: '', address: '', cuidadores: '', notes: '', lat: '', lng: '' });
  const valid = form.name.trim();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('col.form.nameLabel')}</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('col.form.namePh')} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('col.form.addressLabel')}</label>
        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('col.form.addressPh')} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('col.form.carersLabel')}</label>
        <input type="text" value={form.cuidadores} onChange={e => setForm({ ...form, cuidadores: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder={t('col.form.carersPh')} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1 flex items-center gap-1.5" style={labelStyle}>
          <Locate className="w-3 h-3" /> {t('col.form.coordsLabel')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" step="any" value={form.lat ?? ''}
                 onChange={e => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : '' })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}
                 placeholder={t('col.form.latPh')} />
          <input type="number" step="any" value={form.lng ?? ''}
                 onChange={e => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : '' })}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono" style={inputStyle}
                 placeholder={t('col.form.lngPh')} />
        </div>
        {fromMap ? (
          <p className="text-[11px] mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded"
             style={{ color: '#4A6332', backgroundColor: '#DDE6CC' }}>
            <Check className="w-3 h-3" /> {t('col.form.fromMapNote')}
          </p>
        ) : (
          <p className="text-[11px] mt-1.5" style={{ color: '#78706A' }}>
            {t('col.form.coordsHint')}
          </p>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>{t('col.form.notesLabel')}</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={4} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle}
                  placeholder={t('col.form.notesPh')} />
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
