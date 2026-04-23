// Primitivos de UI reutilizables. Sin estado global, sin lógica de negocio.
// Todo lo que reciben viene por props. Si algún día montamos Storybook o tests
// de UI, estos son los candidatos naturales porque son puros.

import { Crown, X, AlertTriangle } from 'lucide-react';
import { CER_STATUS, ROLES, SHIFT_TASKS } from '../constants.js';

export const StatusBadge = ({ status, size = 'md' }) => {
  const s = CER_STATUS[status] || CER_STATUS.pendiente;
  const sizes = { sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-2.5 py-1', lg: 'text-sm px-3 py-1.5' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizes[size]}`}
          style={{ backgroundColor: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {s.short}
    </span>
  );
};

export const CatAvatar = ({ cat, size = 56 }) => {
  if (cat.photo) {
    return (
      <img src={cat.photo} alt={cat.name}
           className="object-cover rounded-full ring-2 ring-white"
           style={{ width: size, height: size, boxShadow: '0 2px 8px rgba(42,37,32,0.12)' }} />
    );
  }
  const initial = (cat.name || '?').slice(0, 1).toUpperCase();
  const s = CER_STATUS[cat.cerStatus] || CER_STATUS.pendiente;
  return (
    <div className="flex items-center justify-center rounded-full font-serif"
         style={{ width: size, height: size, backgroundColor: s.bg, color: s.color, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
};

export const UserAvatar = ({ name, color = '#2D4A3E', size = 36 }) => {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-full font-medium flex-shrink-0"
         style={{ width: size, height: size, backgroundColor: color, color: '#F5EDD8', fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
};

export const OrgAvatar = ({ org, size = 36 }) => {
  const initials = (org?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-lg font-serif flex-shrink-0"
         style={{ width: size, height: size, backgroundColor: org?.color || '#2D4A3E', color: '#F5EDD8', fontSize: size * 0.34 }}>
      {initials}
    </div>
  );
};

export const RoleBadge = ({ role, size = 'md' }) => {
  const r = ROLES[role];
  if (!r) return null;
  const sizes = { sm: 'text-[10px] px-2 py-0.5', md: 'text-xs px-2.5 py-1' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizes[size]}`}
          style={{ backgroundColor: r.bg, color: r.color }}>
      {role === 'admin' && <Crown className="w-3 h-3" />}
      {r.short}
    </span>
  );
};

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
         style={{ backgroundColor: '#EDE4D0' }}>
      <Icon className="w-7 h-7" style={{ color: '#8A7A5C' }} />
    </div>
    <h3 className="font-serif text-xl mb-2" style={{ color: '#1A1712' }}>{title}</h3>
    <p className="text-sm mb-6 max-w-sm" style={{ color: '#78706A' }}>{description}</p>
    {action}
  </div>
);

export const FilterPill = ({ active, onClick, count, dotColor, children }) => (
  <button onClick={onClick}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${active ? 'shadow-sm' : ''}`}
          style={{
            backgroundColor: active ? '#1F3A2F' : '#FDFAF3',
            color: active ? '#F5EDD8' : '#4A433C',
            boxShadow: active ? 'none' : '0 0 0 1px #EADFC9',
          }}>
    {dotColor && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />}
    {children}
    <span className="font-mono" style={{ opacity: 0.6 }}>{count}</span>
  </button>
);

export const Field = ({ label, value, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <dt className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>{label}</dt>
    <dd className="text-sm" style={{ color: '#1A1712' }}>{value}</dd>
  </div>
);

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
         style={{ backgroundColor: 'rgba(26,23,18,0.4)' }} onClick={onClose}>
      <div className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl`}
           style={{ backgroundColor: '#FDFAF3' }}
           onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b"
             style={{ backgroundColor: '#FDFAF3', borderColor: '#F0E8D6' }}>
          <h2 className="font-serif text-xl" style={{ color: '#1A1712' }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F0E8D6]">
            <X className="w-5 h-5" style={{ color: '#4A433C' }} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const TaskPill = ({ task, size = 'md' }) => {
  const t = SHIFT_TASKS[task] || SHIFT_TASKS.otros;
  const Icon = t.icon;
  const sizes = { sm: 'text-[10px] px-1.5 py-0.5 gap-1', md: 'text-xs px-2 py-1 gap-1.5' };
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
          style={{ backgroundColor: t.bg, color: t.color }}>
      <Icon className={iconSize} /> {t.short}
    </span>
  );
};

// Diálogo con la estética de la app. Sustituye a window.confirm/window.alert
// nativos que algunas usuarias podían interpretar como un error del navegador.
// Promesificado por el store: ver useFelinaStore.confirmAsync() y notify().
//
//   destructive=true        → botón principal en rojo (borrados, expulsiones…)
//   destructive=false       → botón principal verde (acciones reversibles)
//   onCancel ausente        → modo notificación: un solo botón, sin cancelar
//   tone: 'warning'|'info'  → color del icono en modo notify
export const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  destructive = false,
  tone = 'warning',
  onConfirm,
  onCancel,
}) => {
  const isNotify = !onCancel;
  const dismiss = isNotify ? onConfirm : onCancel;
  const iconBg = destructive
    ? '#F5DDCE'
    : tone === 'info' ? '#DDE6CC' : '#FDF4DE';
  const iconColor = destructive
    ? '#B15A3A'
    : tone === 'info' ? '#4A6332' : '#8A6B1F';

  return (
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4"
         style={{ backgroundColor: 'rgba(26,23,18,0.55)' }}
         onClick={dismiss}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl p-6"
           style={{ backgroundColor: '#FDFAF3' }}
           onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
             style={{ backgroundColor: iconBg }}>
          <AlertTriangle className="w-6 h-6" style={{ color: iconColor }} />
        </div>
        <h2 className="font-serif text-2xl mb-2" style={{ color: '#1A1712' }}>{title}</h2>
        {message && (
          <p className="text-sm mb-5 leading-relaxed" style={{ color: '#4A433C' }}>{message}</p>
        )}
        <div className="flex gap-2 flex-col-reverse sm:flex-row">
          {!isNotify && (
            <button onClick={onCancel}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              {cancelLabel}
            </button>
          )}
          <button onClick={onConfirm}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: destructive ? '#B15A3A' : '#1F3A2F',
                    color: '#F8F3E8',
                  }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
