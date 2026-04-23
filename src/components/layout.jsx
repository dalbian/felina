// Esqueleto de navegación: sidebar (escritorio), bottom nav (móvil) y selector
// de organización dentro de la sidebar. getNav decide qué items mostrar según
// el rol y si hay org activa.

import { useState } from 'react';
import {
  Crown, Home, MapPin, PawPrint, Calendar, Settings, Map,
  Check, MoreHorizontal, LogOut,
} from 'lucide-react';
import { ROLES } from '../constants.js';
import { OrgAvatar, UserAvatar } from './ui.jsx';

export const OrgSwitcher = ({ currentOrg, userOrgs, currentRole, onSwitch, onCreateNew, isSuperAdmin, onExitToPlatform }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl transition-colors hover:bg-[#F0E8D6]">
        <OrgAvatar org={currentOrg} size={36} />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-medium truncate" style={{ color: '#1A1712' }}>{currentOrg?.name || '—'}</div>
          <div className="text-[10px] uppercase tracking-wider mt-0.5 flex items-center gap-1" style={{ color: isSuperAdmin ? '#8A6B1F' : (ROLES[currentRole]?.color || '#8A7A5C') }}>
            {isSuperAdmin && <Crown className="w-2.5 h-2.5" />}
            {isSuperAdmin ? 'Superadmin' : (ROLES[currentRole]?.label || '—')}
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 flex-shrink-0" style={{ color: '#8A7A5C' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl py-1.5 max-h-[70vh] overflow-y-auto"
               style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 24px rgba(42,37,32,0.14), 0 0 0 1px #EADFC9' }}>
            {isSuperAdmin && onExitToPlatform && (
              <>
                <button onClick={() => { onExitToPlatform(); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#FDF4DE] text-left">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#8A6B1F' }}>
                    <Crown className="w-3.5 h-3.5" style={{ color: '#FDF4DE' }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#8A6B1F' }}>Volver a Plataforma</span>
                </button>
                <div className="border-t my-1" style={{ borderColor: '#F0E8D6' }} />
              </>
            )}
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>
              {isSuperAdmin ? 'Todas las organizaciones' : 'Tus organizaciones'}
            </div>
            {userOrgs.map(({ org, role }) => (
              <button key={org.id} onClick={() => { onSwitch(org.id); setOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#FDFAF3] text-left">
                <OrgAvatar org={org} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: '#1A1712' }}>{org.name}</div>
                  <div className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: ROLES[role]?.color }}>
                    {role === 'admin' && isSuperAdmin && <Crown className="w-2.5 h-2.5" style={{ color: '#8A6B1F' }} />}
                    {ROLES[role]?.short}
                    {org.suspended && <span className="ml-1 text-[9px]" style={{ color: '#B15A3A' }}>· suspendida</span>}
                  </div>
                </div>
                {currentOrg?.id === org.id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#6B8E4E' }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const getNav = ({ isSuperAdmin, hasOrg }) => {
  const items = [];
  if (isSuperAdmin) items.push({ key: 'platform', label: 'Plataforma', icon: Crown });
  if (hasOrg) items.push(
    { key: 'dashboard', label: 'Panel',      icon: Home },
    { key: 'colonies',  label: 'Colonias',   icon: MapPin },
    { key: 'map',       label: 'Mapa',       icon: Map },
    { key: 'cats',      label: 'Gatos',      icon: PawPrint },
    { key: 'calendar',  label: 'Calendario', icon: Calendar },
    { key: 'settings',  label: 'Ajustes',    icon: Settings },
  );
  return items;
};

export const Sidebar = ({ view, onNav, currentOrg, userOrgs, currentRole, currentUser, onSwitchOrg, onCreateOrg, onLogout, isSuperAdmin }) => {
  const navItems = getNav({ isSuperAdmin, hasOrg: !!currentOrg });
  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 py-6 px-4 sticky top-[28px] h-[calc(100vh-28px)]">
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1F3A2F' }}>
          <PawPrint className="w-4 h-4" style={{ color: '#F5EDD8' }} />
        </div>
        <div>
          <div className="font-serif text-xl leading-none" style={{ color: '#1A1712' }}>Felina</div>
          <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#8A7A5C' }}>gestión CER</div>
        </div>
      </div>

      {currentOrg ? (
        <OrgSwitcher currentOrg={currentOrg} userOrgs={userOrgs} currentRole={currentRole}
                     onSwitch={onSwitchOrg} onCreateNew={onCreateOrg} isSuperAdmin={isSuperAdmin}
                     onExitToPlatform={isSuperAdmin ? () => onNav('platform') : null} />
      ) : isSuperAdmin ? (
        <button onClick={() => onNav('platform')}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl"
                style={{ backgroundColor: '#FDF4DE', boxShadow: '0 0 0 1px #E8D4A0' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#8A6B1F' }}>
            <Crown className="w-4 h-4" style={{ color: '#FDF4DE' }} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium" style={{ color: '#1A1712' }}>Plataforma</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: '#8A6B1F' }}>Super admin</div>
          </div>
        </button>
      ) : null}

      <nav className="space-y-0.5 mt-6">
        {navItems.map(({ key, label, icon: Icon }) => {
          const active = view === key || (key === 'colonies' && view === 'colony') || (key === 'cats' && view === 'cat');
          return (
            <button key={key} onClick={() => onNav(key)}
                    className="w-full inline-flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? (key === 'platform' ? '#8A6B1F' : '#1F3A2F') : 'transparent',
                      color: active ? '#F5EDD8' : '#4A433C'
                    }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#F2EADB' }}>
          <UserAvatar name={currentUser?.name} color={currentUser?.color} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: '#1A1712' }}>{currentUser?.name}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: isSuperAdmin && !currentOrg ? '#8A6B1F' : (ROLES[currentRole]?.color || '#8A7A5C') }}>
              {isSuperAdmin && !currentOrg ? 'Super admin' : (ROLES[currentRole]?.short || '—')}
            </div>
          </div>
          <button onClick={onLogout} title="Cerrar sesión"
                  className="p-1.5 rounded-lg hover:bg-[#E8DFCE]">
            <LogOut className="w-4 h-4" style={{ color: '#4A433C' }} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export const BottomNav = ({ view, onNav, isSuperAdmin, hasOrg }) => {
  const navItems = getNav({ isSuperAdmin, hasOrg });
  if (navItems.length === 0) return null;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t grid"
         style={{ backgroundColor: '#FDFAF3', borderColor: '#EADFC9', gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}>
      {navItems.map(({ key, label, icon: Icon }) => {
        const active = view === key || (key === 'colonies' && view === 'colony') || (key === 'cats' && view === 'cat');
        return (
          <button key={key} onClick={() => onNav(key)}
                  className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
                  style={{ color: active ? (key === 'platform' ? '#8A6B1F' : '#1F3A2F') : '#8A7A5C' }}>
            <Icon className="w-5 h-5" /> {label}
          </button>
        );
      })}
    </nav>
  );
};
