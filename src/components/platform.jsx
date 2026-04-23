// Vista exclusiva de superadministradores: tabla de orgs (con filtros), tabla
// de usuarios (con filtro por org), gestión de suspensión/eliminación.

import { useState } from 'react';
import {
  Plus, Crown, Search, X, Edit3, MoreHorizontal, AlertTriangle, Building2,
  ChevronRight, Trash2, Check,
} from 'lucide-react';
import { fmtRelative } from '../lib/dates.js';
import { ROLES } from '../constants.js';
import { OrgAvatar, UserAvatar, EmptyState } from './ui.jsx';
import { inputStyle } from '../styles.jsx';

export const PlatformView = ({ organizations, users, memberships, colonies, cats, events,
                        onCreateOrg, onDeleteOrg, onSuspendOrg, onEnterOrg, onEditOrg, onToggleSuperAdmin, onResetUserPassword, currentUserId }) => {
  const [tab, setTab] = useState('orgs');
  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userOrgFilter, setUserOrgFilter] = useState('all'); // 'all' | 'superadmin' | orgId

  const activeOrgs = organizations.filter(o => !o.suspended);
  const suspendedOrgs = organizations.filter(o => o.suspended);

  const norm = (s) => (s || '').toString().toLowerCase();

  const filteredOrgs = organizations.filter(o => {
    const q = norm(orgSearch).trim();
    if (!q) return true;
    return norm(o.name).includes(q) || norm(o.city).includes(q) || norm(o.contactEmail).includes(q);
  });

  const filteredUsers = users.filter(u => {
    if (userOrgFilter === 'superadmin') {
      if (!u.superAdmin) return false;
    } else if (userOrgFilter !== 'all') {
      const belongs = memberships.some(m => m.userId === u.id && m.orgId === userOrgFilter);
      if (!belongs) return false;
    }
    const q = norm(userSearch).trim();
    if (!q) return true;
    return norm(u.name).includes(q) || norm(u.email).includes(q);
  });

  const stat = ({ value, label, sub, color = '#1A1712' }) => (
    <div className="p-5 rounded-2xl"
         style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
      <div className="text-[10px] uppercase tracking-widest font-medium mb-2" style={{ color: '#8A7A5C', letterSpacing: '0.12em' }}>{label}</div>
      <div className="font-serif text-3xl md:text-4xl leading-none mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-2" style={{ color: '#78706A' }}>{sub}</div>}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
           style={{ backgroundColor: '#8A6B1F', color: '#FDF4DE' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #FDF4DE 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] mb-2 opacity-80">
              <Crown className="w-3 h-3" /> Superadministración
            </div>
            <h1 className="font-serif text-4xl md:text-5xl mb-2">Plataforma</h1>
            <p className="text-sm opacity-80 max-w-xl">
              Gestión global de todas las organizaciones dadas de alta en la plataforma.
              Desde aquí puedes crear, suspender, eliminar o auditar cualquier organización.
            </p>
          </div>
          <button onClick={onCreateOrg}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#FDF4DE', color: '#8A6B1F' }}>
            <Plus className="w-4 h-4" /> Nueva organización
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stat({ value: activeOrgs.length, label: 'Organizaciones', sub: suspendedOrgs.length > 0 ? `${suspendedOrgs.length} suspendidas` : 'todas activas' })}
        {stat({ value: users.length, label: 'Usuarios', sub: `${users.filter(u => u.superAdmin).length} super admin` })}
        {stat({ value: colonies.length, label: 'Colonias', color: '#2D4A3E' })}
        {stat({ value: cats.length, label: 'Gatos totales', color: '#6B8E4E' })}
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: '#EADFC9' }}>
        <button onClick={() => setTab('orgs')}
                className="px-4 py-2.5 text-sm font-medium -mb-px"
                style={{
                  color: tab === 'orgs' ? '#1A1712' : '#8A7A5C',
                  borderBottom: tab === 'orgs' ? '2px solid #8A6B1F' : '2px solid transparent'
                }}>
          Organizaciones ({organizations.length})
        </button>
        <button onClick={() => setTab('users')}
                className="px-4 py-2.5 text-sm font-medium -mb-px"
                style={{
                  color: tab === 'users' ? '#1A1712' : '#8A7A5C',
                  borderBottom: tab === 'users' ? '2px solid #8A6B1F' : '2px solid transparent'
                }}>
          Usuarios ({users.length})
        </button>
      </div>

      {tab === 'orgs' && (
        <div className="space-y-3">
          {organizations.length === 0 ? (
            <EmptyState icon={Building2} title="Sin organizaciones" description="Crea la primera organización para empezar."
                        action={<button onClick={onCreateOrg} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#8A6B1F', color: '#FDF4DE' }}>Nueva organización</button>} />
          ) : (
            <>
              {/* Buscador de organizaciones */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8A7A5C' }} />
                  <input type="text" value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
                         placeholder="Buscar por nombre, ciudad o email…"
                         className="w-full pl-9 pr-9 py-2 rounded-xl text-sm outline-none"
                         style={inputStyle} />
                  {orgSearch && (
                    <button onClick={() => setOrgSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#F0E8D6]"
                            title="Limpiar">
                      <X className="w-3.5 h-3.5" style={{ color: '#8A7A5C' }} />
                    </button>
                  )}
                </div>
                <div className="text-xs" style={{ color: '#78706A' }}>
                  {filteredOrgs.length === organizations.length
                    ? `${organizations.length} organización${organizations.length !== 1 ? 'es' : ''}`
                    : `${filteredOrgs.length} de ${organizations.length}`}
                </div>
              </div>

              {filteredOrgs.length === 0 ? (
                <div className="rounded-2xl p-8 text-center text-sm" style={{ backgroundColor: '#FDFAF3', color: '#78706A', boxShadow: '0 0 0 1px #EADFC9' }}>
                  Ninguna organización coincide con "<strong>{orgSearch}</strong>".
                </div>
              ) : filteredOrgs.map(org => {
                const orgMems = memberships.filter(m => m.orgId === org.id);
                const orgCols = colonies.filter(c => c.orgId === org.id).length;
                const orgCatCount = cats.filter(c => c.orgId === org.id).length;
                const admins = orgMems.filter(m => m.role === 'admin').length;
                return (
                  <PlatformOrgRow key={org.id} org={org} memberCount={orgMems.length}
                                  adminCount={admins} colonyCount={orgCols} catCount={orgCatCount}
                                  onEnter={() => onEnterOrg(org.id)}
                                  onEdit={() => onEditOrg(org)}
                                  onSuspend={() => onSuspendOrg(org.id)}
                                  onDelete={() => onDeleteOrg(org.id)} />
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-3">
          {/* Filtros de usuarios: búsqueda + selector de organización */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8A7A5C' }} />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                     placeholder="Buscar por nombre o email…"
                     className="w-full pl-9 pr-9 py-2 rounded-xl text-sm outline-none"
                     style={inputStyle} />
              {userSearch && (
                <button onClick={() => setUserSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[#F0E8D6]"
                        title="Limpiar">
                  <X className="w-3.5 h-3.5" style={{ color: '#8A7A5C' }} />
                </button>
              )}
            </div>
            <select value={userOrgFilter} onChange={e => setUserOrgFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none min-w-[180px]" style={inputStyle}>
              <option value="all">Todas las organizaciones</option>
              <option value="superadmin">Solo superadministradores</option>
              <optgroup label="Filtrar por organización">
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </optgroup>
            </select>
            <div className="text-xs" style={{ color: '#78706A' }}>
              {filteredUsers.length === users.length
                ? `${users.length} usuario${users.length !== 1 ? 's' : ''}`
                : `${filteredUsers.length} de ${users.length}`}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="rounded-2xl p-8 text-center text-sm" style={{ backgroundColor: '#FDFAF3', color: '#78706A', boxShadow: '0 0 0 1px #EADFC9' }}>
              Ningún usuario coincide con los filtros actuales.
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
              {filteredUsers.map((u, i) => {
                const uMems = memberships.filter(m => m.userId === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3 p-4"
                       style={{ borderTop: i > 0 ? '1px solid #F0E8D6' : 'none' }}>
                    <div className="relative">
                      <UserAvatar name={u.name} color={u.color} size={40} />
                      {u.superAdmin && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                             style={{ backgroundColor: '#8A6B1F', color: '#FDF4DE' }}>
                          <Crown className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: '#1A1712' }}>{u.name}</div>
                      {u.email && <div className="text-xs truncate" style={{ color: '#78706A' }}>{u.email}</div>}
                      <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: '#8A7A5C' }}>
                        {u.superAdmin ? 'Super administrador' : `${uMems.length} organización${uMems.length !== 1 ? 'es' : ''}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {u.id !== currentUserId && (
                        <button onClick={() => onResetUserPassword(u)}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
                          Resetear contraseña
                        </button>
                      )}
                      <button onClick={() => onToggleSuperAdmin(u.id)}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium"
                              style={{
                                backgroundColor: u.superAdmin ? '#FDF4DE' : '#F2EADB',
                                color: u.superAdmin ? '#8A6B1F' : '#4A433C',
                                boxShadow: u.superAdmin ? '0 0 0 1px #E8D4A0' : 'none'
                              }}>
                        {u.superAdmin ? 'Quitar superadmin' : 'Hacer superadmin'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PlatformOrgRow = ({ org, memberCount, adminCount, colonyCount, catCount, onEnter, onEdit, onSuspend, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="p-5 rounded-2xl relative"
         style={{
           backgroundColor: org.suspended ? '#F5EFDF' : '#FDFAF3',
           boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9',
           opacity: org.suspended ? 0.7 : 1
         }}>
      <div className="flex items-start gap-4 flex-wrap">
        <OrgAvatar org={org} size={52} />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-xl" style={{ color: '#1A1712' }}>{org.name}</h3>
            {org.suspended && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: '#F5DDCE', color: '#B15A3A' }}>Suspendida</span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#78706A' }}>{org.city || 'Sin ciudad'}
            {org.contactEmail && <span className="font-mono ml-2">· {org.contactEmail}</span>}
          </p>
          <div className="flex gap-4 mt-3 flex-wrap">
            <Stat label="Miembros" value={memberCount} sub={adminCount === 0 ? '⚠ sin admin' : `${adminCount} admin`} warn={adminCount === 0} />
            <Stat label="Colonias" value={colonyCount} />
            <Stat label="Gatos" value={catCount} />
            <Stat label="Creada" value={fmtRelative(org.createdAt)} small />
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <button onClick={onEnter}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#1F3A2F', color: '#F5EDD8' }}>
            Entrar <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 rounded-xl py-1.5 min-w-[200px]"
                     style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(42,37,32,0.14), 0 0 0 1px #EADFC9' }}>
                  <button onClick={() => { onEdit(); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3] flex items-center gap-2" style={{ color: '#1A1712' }}>
                    <Edit3 className="w-3.5 h-3.5" /> Editar información
                  </button>
                  <button onClick={() => { onSuspend(); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3] flex items-center gap-2" style={{ color: '#1A1712' }}>
                    {org.suspended ? <><Check className="w-3.5 h-3.5" /> Reactivar</> : <><AlertTriangle className="w-3.5 h-3.5" /> Suspender</>}
                  </button>
                  <div className="border-t my-1" style={{ borderColor: '#F0E8D6' }} />
                  <button onClick={() => { onDelete(); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#FDFAF3] flex items-center gap-2"
                          style={{ color: '#B15A3A' }}>
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar permanentemente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Stat = ({ label, value, sub, warn, small }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>{label}</div>
    <div className={`font-serif ${small ? 'text-sm mt-1' : 'text-xl'}`} style={{ color: '#1A1712' }}>{value}</div>
    {sub && <div className="text-[10px] mt-0.5" style={{ color: warn ? '#B15A3A' : '#78706A' }}>{sub}</div>}
  </div>
);
