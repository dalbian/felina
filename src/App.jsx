// App.jsx es el orquestador principal: consume el store, renderiza la rama de
// sesión correcta (login / suspendido / app principal) y cablea todos los
// modales globales. La lógica de negocio vive en hooks/useFelinaStore; los
// componentes de vista en components/*; los helpers puros en lib/*.

import { AlertTriangle, ChevronRight, Crown } from 'lucide-react';

import { can } from './lib/permissions.js';
import { GlobalStyle } from './styles.jsx';
import { OrgAvatar, ConfirmDialog } from './components/ui.jsx';
import { useFelinaStore } from './hooks/useFelinaStore.js';
import { Dashboard } from './components/dashboard.jsx';
import { ColoniesView, ColonyDetail } from './components/colonies.jsx';
import { CatsView, CatDetail } from './components/cats.jsx';
import { MapView } from './components/map.jsx';
import { CalendarView } from './components/calendar.jsx';
import { PrototypeBanner, RgpdGate, LoginScreen } from './components/auth.jsx';
import { SettingsView } from './components/settings.jsx';
import { PlatformView } from './components/platform.jsx';
import { Sidebar, BottomNav } from './components/layout.jsx';
import { GlobalModals } from './components/modals.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: LISTA DE COLONIAS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: DETALLE DE COLONIA
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TARJETA DE GATO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: LISTA DE GATOS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: DETALLE DE GATO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// MODAL GENÉRICO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO: GATO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO: GATO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO: COLONIA
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIO: EVENTO VETERINARIO
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: LOGIN (selección de usuario demo o creación de nueva org)
// ─────────────────────────────────────────────────────────────────────────────

// Banner fino siempre visible recordando que es una versión de pruebas.
// Altura fija de 28px — la Sidebar compensa con top-[28px] y h-[calc(100vh-28px)].
// Aviso legal mostrado una sola vez por usuario tras el primer login correcto.
// Se persiste en localStorage con la clave felina:rgpdAck:<userId>.
// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: SELECTOR DE ORGANIZACIÓN (en la sidebar)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: AJUSTES (organización + miembros + sesión)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: PLATAFORMA (solo superadministradores)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: MAPA (Leaflet + OpenStreetMap)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CALENDARIO: COMPONENTES DE APOYO Y FORMULARIOS
// ─────────────────────────────────────────────────────────────────────────────

// Chip compacto de turno para la vista mensual / semanal (mini, 1 línea)
// Fila de turno (vista de lista, más información)
// Formulario: plantilla de turno recurrente
// Formulario: asignar turno a un miembro
// Modal de detalle de un turno: muestra info + acciones contextuales según estado y rol
// ─────────────────────────────────────────────────────────────────────────────
// CALENDARIO: VISTAS (mes, semana, mis turnos, plantillas)
// ─────────────────────────────────────────────────────────────────────────────

// Contenedor principal del calendario
// ─────────────────────────────────────────────────────────────────────────────
// NAVEGACIÓN
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const {
    // UI state
    loading, session, rgpdAcknowledged,
    view, selectedColony, setSelectedColony, selectedCat, setSelectedCat,
    selectedShift, setSelectedShift, selectedTemplate, setSelectedTemplate,
    modal, setModal, filter, setFilter,
    confirmState, resolveConfirm, notify,
    // Datos
    organizations, users, memberships, colonies, cats, events, shiftTemplates, shifts,
    // Derivados
    currentUser, currentOrg, isSuperAdmin, currentRole,
    orgColonies, orgCats, orgEvents, orgTemplates, orgShifts,
    userOrgs, orgMembers, realMembership,
    // Handlers
    handleAcceptRgpd,
    handleLogin, handleLogout, handleResetData,
    handleCreateNewOrg, handleSwitchOrg,
    handleEditOrg, handleLeaveOrg, handleDeleteOrg,
    handleAddMember, handleRemoveMember, handleChangeRole,
    handleChangeMyPassword, handleResetPassword,
    handlePlatformCreateOrg, handlePlatformDeleteOrg,
    handlePlatformSuspendOrg, handlePlatformEditOrg,
    handleToggleSuperAdmin,
    handleExitToPlatform, handleEnterOrgAsSuperAdmin,
    saveColony, deleteColony,
    saveCat, deleteCat, changeCatStatus,
    saveEvent,
    saveShiftTemplate, deleteShiftTemplate,
    claimShift, unclaimShift, assignShiftTo, completeShift, uncompleteShift,
    onNav,
  } = useFelinaStore();


  // ───── Renderizado ─────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F3E8' }}>
        <div className="font-serif italic text-xl" style={{ color: '#8A7A5C' }}>Cargando…</div>
      </div>
    );
  }

  const globalStyle = <GlobalStyle />;

  // No hay sesión → pantalla de acceso
  if (!session || !currentUser) {
    return (
      <>
        {globalStyle}
        <PrototypeBanner />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // Usuario regular sin org (caso raro) → volver al login
  if (!currentOrg && !isSuperAdmin) {
    return (
      <>
        {globalStyle}
        <PrototypeBanner />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // Org suspendida + usuario no superadmin → pantalla de bloqueo
  if (currentOrg?.suspended && !isSuperAdmin) {
    const otherOrgs = userOrgs.filter(({ org }) => !org.suspended && org.id !== currentOrg.id);
    return (
      <>
        {globalStyle}
        <PrototypeBanner />
        {!rgpdAcknowledged && <RgpdGate userName={currentUser.name} onAccept={handleAcceptRgpd} />}
        <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F8F3E8' }}>
          <div className="max-w-md w-full rounded-3xl p-8 text-center"
               style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #F5DDCE' }}>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ backgroundColor: '#F5DDCE' }}>
              <AlertTriangle className="w-7 h-7" style={{ color: '#B15A3A' }} />
            </div>
            <h1 className="font-serif text-2xl mb-2" style={{ color: '#1A1712' }}>Organización suspendida</h1>
            <p className="text-sm mb-6" style={{ color: '#6B635A' }}>
              <strong>{currentOrg.name}</strong> está suspendida temporalmente. Contacta con la administración de la plataforma para reactivarla.
            </p>
            {otherOrgs.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>Otras organizaciones</div>
                <div className="space-y-2">
                  {otherOrgs.map(({ org, role }) => (
                    <button key={org.id} onClick={() => handleSwitchOrg(org.id)}
                            className="w-full flex items-center gap-2 p-3 rounded-xl text-left"
                            style={{ backgroundColor: '#F8F3E8', boxShadow: '0 0 0 1px #EADFC9' }}>
                      <OrgAvatar org={org} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#1A1712' }}>{org.name}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: ROLES[role]?.color }}>{ROLES[role]?.short}</div>
                      </div>
                      <ChevronRight className="w-4 h-4" style={{ color: '#B8A888' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </>
    );
  }

  const currentColony = orgColonies.find(c => c.id === selectedColony);
  const currentCat = orgCats.find(c => c.id === selectedCat);
  const currentCatColony = currentCat ? orgColonies.find(c => c.id === currentCat.colonyId) : null;
  // Banner: el superadmin está dentro de una org sin ser miembro real
  const showSuperAdminBanner = isSuperAdmin && currentOrg && !realMembership;
  // Org actualmente suspendida (bloquear mutaciones)
  const orgSuspended = currentOrg?.suspended === true;

  return (
    <>
      {globalStyle}
      <PrototypeBanner />
      {!rgpdAcknowledged && <RgpdGate userName={currentUser.name} onAccept={handleAcceptRgpd} />}
      <div className="min-h-screen flex" style={{ backgroundColor: '#F8F3E8' }}>
        <Sidebar view={view} onNav={onNav}
                 currentOrg={currentOrg} userOrgs={userOrgs} currentRole={currentRole} currentUser={currentUser}
                 onSwitchOrg={isSuperAdmin ? handleEnterOrgAsSuperAdmin : handleSwitchOrg}
                 onCreateOrg={() => setModal('createOrg')}
                 onLogout={handleLogout}
                 isSuperAdmin={isSuperAdmin} />

        <main className="flex-1 min-w-0 pb-20 md:pb-8">
          {showSuperAdminBanner && (
            <div className="sticky top-[28px] z-20 flex items-center justify-between gap-3 px-5 md:px-8 py-2.5 text-xs"
                 style={{ backgroundColor: '#FDF4DE', borderBottom: '1px solid #E8D4A0', color: '#8A6B1F' }}>
              <span className="flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                Estás viendo <strong>{currentOrg.name}</strong> como superadministrador
                {orgSuspended && <span className="ml-2 px-2 py-0.5 rounded" style={{ backgroundColor: '#F5DDCE', color: '#B15A3A' }}>Organización suspendida</span>}
              </span>
              <button onClick={handleExitToPlatform} className="font-medium hover:underline">
                ← Volver a Plataforma
              </button>
            </div>
          )}
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">
            {view === 'platform' && isSuperAdmin && (
              <PlatformView organizations={organizations} users={users} memberships={memberships}
                            colonies={colonies} cats={cats} events={events}
                            currentUserId={currentUser.id}
                            onCreateOrg={() => setModal('platformCreateOrg')}
                            onDeleteOrg={handlePlatformDeleteOrg}
                            onSuspendOrg={handlePlatformSuspendOrg}
                            onEnterOrg={handleEnterOrgAsSuperAdmin}
                            onEditOrg={(org) => { setSelectedColony(null); setModal({ type: 'platformEditOrg', org }); }}
                            onToggleSuperAdmin={handleToggleSuperAdmin}
                            onResetUserPassword={(user) => setModal({ type: 'resetPassword', userId: user.id, userName: user.name })} />
            )}
            {view === 'dashboard' && currentOrg && (
              <Dashboard cats={orgCats} colonies={orgColonies} events={orgEvents}
                         templates={orgTemplates} shifts={orgShifts} members={orgMembers}
                         onNavigate={onNav} />
            )}
            {view === 'colonies' && currentOrg && (
              <ColoniesView colonies={orgColonies} cats={orgCats}
                            onSelect={(id) => onNav('colony', id)}
                            onAdd={() => can(currentRole, 'add_colony') ? setModal('addColony') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite añadir colonias.' })} />
            )}
            {view === 'map' && currentOrg && (
              <MapView colonies={orgColonies} cats={orgCats} orgName={currentOrg.name}
                       onSelectColony={(id) => onNav('colony', id)}
                       canAddColony={can(currentRole, 'add_colony') && !orgSuspended}
                       onPickLocation={({ lat, lng }) => setModal({ type: 'addColony', prefill: { lat, lng } })} />
            )}
            {view === 'colony' && currentColony && (
              <ColonyDetail colony={currentColony} cats={orgCats}
                            onBack={() => setView('colonies')}
                            onSelectCat={(id) => onNav('cat', id)}
                            onAddCat={() => can(currentRole, 'add_cat') ? setModal('addCat') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción.' })}
                            onEdit={() => can(currentRole, 'edit_colony') ? setModal('editColony') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción.' })}
                            onDelete={deleteColony}
                            canEdit={can(currentRole, 'edit_colony')}
                            canDelete={can(currentRole, 'delete_colony')}
                            canAddCat={can(currentRole, 'add_cat')} />
            )}
            {view === 'cats' && currentOrg && (
              <CatsView cats={orgCats} colonies={orgColonies}
                        onSelect={(id) => onNav('cat', id)}
                        onAdd={() => can(currentRole, 'add_cat') ? setModal('addCat') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite añadir fichas de gato.' })}
                        filter={filter} setFilter={setFilter} />
            )}
            {view === 'cat' && currentCat && (
              <CatDetail cat={currentCat} colony={currentCatColony} events={events}
                         onBack={() => setView(selectedColony && currentCat.colonyId === selectedColony ? 'colony' : 'cats')}
                         onEdit={() => can(currentRole, 'edit_cat') ? setModal('editCat') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción.' })}
                         onAddEvent={() => can(currentRole, 'add_event') ? setModal('addEvent') : notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción.' })}
                         onDelete={deleteCat}
                         onChangeStatus={changeCatStatus}
                         canEdit={can(currentRole, 'edit_cat')}
                         canDelete={can(currentRole, 'delete_cat')}
                         canAddEvent={can(currentRole, 'add_event')}
                         canChangeStatus={can(currentRole, 'change_status')} />
            )}
            {view === 'calendar' && currentOrg && (
              <CalendarView templates={orgTemplates} shifts={orgShifts}
                            colonies={orgColonies} members={orgMembers}
                            currentUser={currentUser} currentRole={currentRole}
                            onSelectShift={(s) => { setSelectedShift(s); setModal('viewShift'); }}
                            onAddTemplate={() => can(currentRole, 'manage_shifts')
                              ? (setSelectedTemplate(null), setModal('addTemplate'))
                              : notify({ title: 'Sin permiso', message: 'Solo administración o coordinación puede gestionar plantillas de turnos.' })}
                            onEditTemplate={(t) => { setSelectedTemplate(t); setModal('editTemplate'); }} />
            )}
            {view === 'settings' && currentOrg && (
              <SettingsView currentOrg={currentOrg} currentUser={currentUser} currentRole={currentRole}
                            members={orgMembers}
                            onEditOrg={() => setModal('editOrg')}
                            onAddMember={handleAddMember}
                            onRemoveMember={handleRemoveMember}
                            onChangeRole={handleChangeRole}
                            onResetMemberPassword={(member) => setModal({ type: 'resetPassword', userId: member.userId, userName: member.name })}
                            onChangeMyPassword={() => setModal('changeMyPassword')}
                            onLogout={handleLogout}
                            onLeaveOrg={handleLeaveOrg}
                            onDeleteOrg={handleDeleteOrg}
                            onResetData={handleResetData} />
            )}
          </div>
        </main>

        <BottomNav view={view} onNav={onNav} isSuperAdmin={isSuperAdmin} hasOrg={!!currentOrg} />

        <GlobalModals
          modal={modal} setModal={setModal}
          selectedColony={selectedColony}
          selectedCat={selectedCat}
          selectedShift={selectedShift}
          selectedTemplate={selectedTemplate}
          setSelectedShift={setSelectedShift}
          setSelectedTemplate={setSelectedTemplate}
          currentOrg={currentOrg} currentUser={currentUser} currentRole={currentRole}
          orgColonies={orgColonies} orgMembers={orgMembers} orgTemplates={orgTemplates}
          currentColony={currentColony} currentCat={currentCat}
          notify={notify}
          saveColony={saveColony}
          saveCat={saveCat}
          saveEvent={saveEvent}
          handleCreateNewOrg={handleCreateNewOrg} handleEditOrg={handleEditOrg}
          handlePlatformCreateOrg={handlePlatformCreateOrg}
          handlePlatformEditOrg={handlePlatformEditOrg}
          handleChangeMyPassword={handleChangeMyPassword}
          handleResetPassword={handleResetPassword}
          saveShiftTemplate={saveShiftTemplate}
          deleteShiftTemplate={deleteShiftTemplate}
          claimShift={claimShift} unclaimShift={unclaimShift}
          completeShift={completeShift} uncompleteShift={uncompleteShift}
          assignShiftTo={assignShiftTo} />
      </div>

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          destructive={confirmState.destructive}
          onConfirm={() => resolveConfirm(true)}
          onCancel={() => resolveConfirm(false)} />
      )}
    </>
  );
}
