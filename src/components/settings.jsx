// Ajustes de organización: ficha de la org, miembros, sesión del usuario,
// invitar miembros y formularios para crear/editar organizaciones.
// OrgForm también lo importan platform.jsx y App.jsx (modales).

import { useState } from 'react';
import {
  Edit3, UserPlus, Check, MoreHorizontal, LogOut, Shield, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { PASSWORD_MIN, isValidEmail, normalizeEmail, validatePassword } from '../lib/auth.js';
import { ROLES } from '../constants.js';
import { OrgAvatar, UserAvatar, RoleBadge, Modal } from './ui.jsx';
import { inputStyle, labelStyle } from '../styles.jsx';

export const SettingsView = ({ currentOrg, currentUser, currentRole, members, onEditOrg, onAddMember, onRemoveMember, onChangeRole, onResetMemberPassword, onChangeMyPassword, onLogout, onLeaveOrg, onDeleteOrg, onResetData }) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const canManage = currentRole === 'admin';

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>Configuración</div>
        <h1 className="font-serif text-4xl md:text-5xl" style={{ color: '#1A1712' }}>Ajustes</h1>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
        <div className="flex items-start gap-4">
          <OrgAvatar org={currentOrg} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>Organización</div>
            <h2 className="font-serif text-2xl leading-tight" style={{ color: '#1A1712' }}>{currentOrg.name}</h2>
            <div className="text-sm mt-1" style={{ color: '#78706A' }}>
              {currentOrg.city || 'Sin ciudad'}
              {currentOrg.contactEmail && <span className="font-mono text-xs ml-2">· {currentOrg.contactEmail}</span>}
            </div>
          </div>
          {canManage && (
            <button onClick={onEditOrg} className="p-2 rounded-lg" style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-serif text-2xl" style={{ color: '#1A1712' }}>Miembros del equipo</h2>
            <p className="text-sm mt-1" style={{ color: '#78706A' }}>{members.length} persona{members.length !== 1 ? 's' : ''}</p>
          </div>
          {canManage && (
            <button onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg"
                    style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
              <UserPlus className="w-4 h-4" /> Invitar miembro
            </button>
          )}
        </div>
        <div className="rounded-2xl" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
          {members.map((m, i) => (
            <MemberRow key={m.userId} member={m}
                       isCurrentUser={m.userId === currentUser.id}
                       canManage={canManage}
                       onChangeRole={onChangeRole}
                       onRemove={onRemoveMember}
                       onResetPassword={onResetMemberPassword}
                       border={i > 0} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-serif text-2xl mb-4" style={{ color: '#1A1712' }}>Roles y permisos</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(ROLES).map(([key, val]) => (
            <div key={key} className="rounded-xl p-4" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
              <div className="flex items-center gap-2 mb-2">
                <RoleBadge role={key} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#4A433C' }}>{val.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8A7A5C' }}>Sesión</div>
        <div className="flex items-center gap-3 mb-4">
          <UserAvatar name={currentUser.name} color={currentUser.color} size={44} />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: '#1A1712' }}>{currentUser.name}</div>
            {currentUser.email && <div className="text-xs" style={{ color: '#78706A' }}>{currentUser.email}</div>}
          </div>
          <RoleBadge role={currentRole} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onChangeMyPassword} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
            <Shield className="w-4 h-4" /> Cambiar contraseña
          </button>
          <button onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
          {!canManage && (
            <button onClick={onLeaveOrg} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: 'transparent', color: '#B15A3A' }}>
              Salir de esta organización
            </button>
          )}
        </div>
      </div>

      {canManage && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #F5DDCE' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#B15A3A' }}>Zona peligrosa</div>
          <p className="text-sm mb-3" style={{ color: '#4A433C' }}>
            Eliminar la organización borra todas sus colonias, gatos, eventos y miembros. Esta acción no se puede deshacer.
          </p>
          <button onClick={onDeleteOrg} className="text-sm font-medium hover:underline" style={{ color: '#B15A3A' }}>
            Eliminar organización permanentemente
          </button>
        </div>
      )}

      <div className="rounded-2xl p-5" style={{ backgroundColor: '#FDF4DE', boxShadow: '0 0 0 1px #E8D4A0' }}>
        <div className="text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: '#8A6B1F' }}>
          <AlertTriangle className="w-3 h-3" /> Modo de pruebas
        </div>
        <p className="text-sm mb-3" style={{ color: '#4A433C' }}>
          Restablece la aplicación a su estado inicial con los datos de demostración. Útil si quieres empezar de cero o si algo se ha roto en tus pruebas. Solo afecta a este dispositivo — no toca los datos de otras personas que estén probando Felina.
        </p>
        <button onClick={onResetData}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#FDFAF3', color: '#8A6B1F', boxShadow: '0 0 0 1px #E8D4A0' }}>
          <RefreshCw className="w-4 h-4" /> Reiniciar datos de este navegador
        </button>
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invitar miembro">
        <InviteForm
          onSave={async (data) => {
            const result = await onAddMember(data);
            if (result?.ok) setInviteOpen(false);
            return result;
          }}
          onCancel={() => setInviteOpen(false)} />
      </Modal>
    </div>
  );
};

export const MemberRow = ({ member, isCurrentUser, canManage, onChangeRole, onRemove, onResetPassword, border }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 p-4" style={{ borderTop: border ? '1px solid #F0E8D6' : 'none' }}>
      <UserAvatar name={member.name} color={member.color} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-sm truncate" style={{ color: '#1A1712' }}>{member.name}</span>
          {isCurrentUser && <span className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>tú</span>}
        </div>
        {member.email && <div className="text-xs truncate" style={{ color: '#78706A' }}>{member.email}</div>}
      </div>
      <RoleBadge role={member.role} />
      {canManage && !isCurrentUser && (
        <div className="relative">
          <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-[#F0E8D6]">
            <MoreHorizontal className="w-4 h-4" style={{ color: '#78706A' }} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 rounded-xl py-1.5 min-w-[200px]"
                   style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(42,37,32,0.14), 0 0 0 1px #EADFC9' }}>
                <div className="px-3 py-1 text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>Cambiar rol</div>
                {Object.entries(ROLES).map(([k, v]) => (
                  <button key={k} onClick={() => { onChangeRole(member.userId, k); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3] flex items-center justify-between">
                    <span style={{ color: '#1A1712' }}>{v.label}</span>
                    {member.role === k && <Check className="w-3.5 h-3.5" style={{ color: '#6B8E4E' }} />}
                  </button>
                ))}
                <div className="border-t my-1" style={{ borderColor: '#F0E8D6' }} />
                <button onClick={() => { onResetPassword(member); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3]" style={{ color: '#1A1712' }}>
                  Restablecer contraseña…
                </button>
                <button onClick={() => { onRemove(member.userId); setMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3]" style={{ color: '#B15A3A' }}>
                  Expulsar del equipo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const InviteForm = ({ onSave, onCancel }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', role: 'volunteer' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const name = form.name.trim();
    const email = normalizeEmail(form.email);
    if (!name) { setError('El nombre es obligatorio.'); return; }
    if (!email || !isValidEmail(email)) { setError('Introduce un email válido (será su nombre de usuario).'); return; }
    const pwErr = validatePassword(form.password, form.passwordConfirm);
    if (pwErr) { setError(pwErr); return; }
    setBusy(true);
    const result = await onSave({ name, email, password: form.password, role: form.role });
    setBusy(false);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs rounded-lg p-3" style={{ color: '#78706A', backgroundColor: '#F2EADB' }}>
        Le creas una cuenta con email y contraseña. <strong>Comparte la contraseña de forma segura</strong> — puede cambiarla desde sus ajustes al entrar.
      </p>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre completo *</label>
        <input type="text" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="Nombre Apellido" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Email (nombre de usuario) *</label>
        <input type="email" autoComplete="off" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); }}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="persona@ejemplo.org" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Contraseña * <span style={{ color: '#8A7A5C' }}>(mín. {PASSWORD_MIN})</span></label>
          <input type="password" autoComplete="new-password" value={form.password}
                 onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={labelStyle}>Confirmar contraseña *</label>
          <input type="password" autoComplete="new-password" value={form.passwordConfirm}
                 onChange={e => { setForm({ ...form, passwordConfirm: e.target.value }); setError(''); }}
                 className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} placeholder="••••••••" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-2" style={labelStyle}>Rol en la organización</label>
        <div className="space-y-2">
          {Object.entries(ROLES).map(([k, v]) => {
            const active = form.role === k;
            return (
              <button key={k} type="button" onClick={() => setForm({ ...form, role: k })}
                      className="w-full text-left p-3 rounded-lg transition-all"
                      style={{
                        backgroundColor: active ? v.bg : '#FFFFFF',
                        boxShadow: active ? `0 0 0 2px ${v.color}` : '0 0 0 1px #EADFC9'
                      }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm" style={{ color: active ? v.color : '#1A1712' }}>{v.label}</span>
                  {active && <Check className="w-3.5 h-3.5" style={{ color: v.color }} />}
                </div>
                <div className="text-xs" style={{ color: active ? v.color : '#78706A' }}>{v.description}</div>
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F5DDCE', color: '#8A3A1F' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>Cancelar</button>
        <button type="button" onClick={submit} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F3A2F', color: '#F8F3E8' }}>
          {busy ? 'Añadiendo…' : 'Añadir al equipo'}
        </button>
      </div>
    </div>
  );
};

export const OrgForm = ({ org, onSave, onCancel }) => {
  const [form, setForm] = useState(org || { name: '', city: '', contactEmail: '' });
  const valid = form.name.trim();
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Nombre de la organización *</label>
        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="Associació Gats del Barri" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Ciudad / municipio</label>
        <input type="text" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="Barcelona" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={labelStyle}>Email de contacto</label>
        <input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
               className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}
               placeholder="info@ejemplo.org" />
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
