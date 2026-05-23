// App.jsx es el orquestador principal: consume el store, renderiza la rama de
// sesión correcta (login / suspendido / app principal) y cablea todos los
// modales globales. La lógica de negocio vive en hooks/useFelinaStore; los
// componentes de vista en components/*; los helpers puros en lib/*.

import { lazy, Suspense } from 'react';
import { AlertTriangle, ChevronRight, Crown } from 'lucide-react';

import { can } from './lib/permissions.js';
import { useTranslation } from './lib/i18n.jsx';
import { ROLES } from './constants.js';
import { GlobalStyle } from './styles.jsx';
import { OrgAvatar, ConfirmDialog } from './components/ui.jsx';
import { useFelinaStore } from './hooks/useFelinaStore.js';
import { Dashboard } from './components/dashboard.jsx';
import { ColoniesView, ColonyDetail } from './components/colonies.jsx';
import { CatsView, CatDetail } from './components/cats.jsx';
import { CalendarView } from './components/calendar.jsx';
import { PrototypeBanner, RgpdGate, LoginScreen, SetPasswordScreen } from './components/auth.jsx';
import { SettingsView } from './components/settings.jsx';
import { Sidebar, BottomNav } from './components/layout.jsx';

// Vistas diferidas (code-splitting). Solo se descargan al navegar a ellas:
//   - MapView: arrastra el componente del mapa (Leaflet ya va por CDN aparte).
//   - PlatformView: solo la usa el super_admin, el resto nunca la descarga.
const MapView = lazy(() => import('./components/map.jsx').then(m => ({ default: m.MapView })));
const PlatformView = lazy(() => import('./components/platform.jsx').then(m => ({ default: m.PlatformView })));
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
  const { t } = useTranslation();
  const {
    // UI state
    loading, session, rgpdAcknowledged,
    view, setView, selectedColony, setSelectedColony, selectedCat, setSelectedCat,
    selectedShift, setSelectedShift, selectedTemplate, setSelectedTemplate,
    modal, setModal, filter, setFilter,
    confirmState, resolveConfirm, notify,
    // Datos
    organizations, users, memberships, colonies, cats, events, shiftTemplates, shifts,
    // Derivados
    currentUser, currentOrg, isSuperAdmin, currentRole,
    orgColonies, orgCats, orgEvents, orgTemplates, orgShifts, orgReminders,
    userOrgs, orgMembers, realMembership,
    // Handlers
    handleAcceptRgpd,
    handleLogin, handleLogout, handleResetData,
    handleForgotPassword, handleSetPassword, passwordSetupMode,
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
    saveCatReminder, deleteCatReminder, completeCatReminder, uncompleteCatReminder,
    saveShiftTemplate, deleteShiftTemplate,
    claimShift, unclaimShift, assignShiftTo, completeShift, uncompleteShift,
    onNav,
  } = useFelinaStore();


  // ───── Renderizado ─────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F3E8' }}>
        <div className="font-serif italic text-xl" style={{ color: '#8A7A5C' }}>{t('common.loading')}</div>
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
        <LoginScreen onLogin={handleLogin} onForgotPassword={handleForgotPassword} />
      </>
    );
  }

  // Usuario llegó desde un email de invitación o recuperación: forzar
  // pantalla de "Define tu contraseña" antes de dejarle ver/usar la app.
  // Para invitaciones, el trigger handle_new_user ya creó la membership
  // con la org invitante; la sacamos de userOrgs para mostrar su nombre.
  // Para recovery, no mostramos nombre de org (no aplica).
  if (passwordSetupMode) {
    const orgName = passwordSetupMode === 'invite'
      ? (userOrgs?.[0]?.org?.name || null)
      : null;
    return (
      <>
        {globalStyle}
        <SetPasswordScreen
          mode={passwordSetupMode}
          userEmail={currentUser?.email}
          orgName={orgName}
          onSubmit={handleSetPassword}
          onLogout={handleLogout} />
      </>
    );
  }

  // Usuario autenticado pero sin pertenencia a ninguna org. Antes (con datos
  // sembrados en localStorage) era un caso raro; con Supabase Auth pasa con
  // frecuencia: cualquier persona registrada queda en este estado hasta que
  // un admin la asigna. Mostrar mensaje claro en lugar de rebotar al login.
  if (!currentOrg && !isSuperAdmin && userOrgs.length === 0) {
    return (
      <>
        {globalStyle}
        <PrototypeBanner />
        {!rgpdAcknowledged && <RgpdGate userName={currentUser.name} onAccept={handleAcceptRgpd} />}
        <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F8F3E8' }}>
          <div className="max-w-md w-full rounded-3xl p-8 text-center"
               style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ backgroundColor: '#FDF4DE' }}>
              <AlertTriangle className="w-7 h-7" style={{ color: '#8A6B1F' }} />
            </div>
            <h1 className="font-serif text-2xl mb-2" style={{ color: '#1A1712' }}>
              {currentUser.name
                ? t('app.noOrg.titleName', { name: currentUser.name.split(' ')[0] })
                : t('app.noOrg.title')}
            </h1>
            <p className="text-sm mb-2" style={{ color: '#6B635A' }}>
              {t('app.noOrg.line1')}
            </p>
            <p className="text-sm mb-6" style={{ color: '#6B635A' }}>
              {t('app.noOrg.line2')}
            </p>
            <div className="px-4 py-2.5 rounded-lg mb-6 font-mono text-sm break-all"
                 style={{ backgroundColor: '#F8F3E8', color: '#1A1712', boxShadow: '0 0 0 1px #EADFC9' }}>
              {currentUser.email}
            </div>
            <button onClick={handleLogout}
                    className="w-full py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: '#F2EADB', color: '#4A433C' }}>
              {t('app.noOrg.logout')}
            </button>
          </div>
        </div>
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
            <h1 className="font-serif text-2xl mb-2" style={{ color: '#1A1712' }}>{t('app.suspended.title')}</h1>
            <p className="text-sm mb-6" style={{ color: '#6B635A' }}>
              {(() => {
                const [before, after = ''] = t('app.suspended.body').split('{org}');
                return <>{before}<strong>{currentOrg.name}</strong>{after}</>;
              })()}
            </p>
            {otherOrgs.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>{t('app.suspended.others')}</div>
                <div className="space-y-2">
                  {otherOrgs.map(({ org, role }) => (
                    <button key={org.id} onClick={() => handleSwitchOrg(org.id)}
                            className="w-full flex items-center gap-2 p-3 rounded-xl text-left"
                            style={{ backgroundColor: '#F8F3E8', boxShadow: '0 0 0 1px #EADFC9' }}>
                      <OrgAvatar org={org} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: '#1A1712' }}>{org.name}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: ROLES[role]?.color }}>{t(`role.${role}.short`)}</div>
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
              {t('app.suspended.logout')}
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

        <main className="flex-1 min-w-0 pb-20 md:pb-8 overflow-x-hidden">
          {showSuperAdminBanner && (
            <div className="sticky top-[28px] z-20 flex items-center justify-between gap-2 px-4 md:px-8 py-2 text-xs"
                 style={{ backgroundColor: '#FDF4DE', borderBottom: '1px solid #E8D4A0', color: '#8A6B1F' }}>
              <span className="flex items-center gap-1.5 min-w-0">
                <Crown className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{t('layout.adminBanner.viewing')}&nbsp;</span>
                <strong className="truncate">{currentOrg.name}</strong>
                <span className="hidden md:inline">&nbsp;{t('layout.adminBanner.as')}</span>
                {orgSuspended && (
                  <span className="ml-1 px-2 py-0.5 rounded flex-shrink-0"
                        style={{ backgroundColor: '#F5DDCE', color: '#B15A3A' }}>
                    {t('layout.adminBanner.suspended')}
                  </span>
                )}
              </span>
              <button onClick={handleExitToPlatform}
                      className="font-medium hover:underline whitespace-nowrap flex-shrink-0">
                <span className="sm:hidden">{t('layout.adminBanner.back')}</span>
                <span className="hidden sm:inline">{t('layout.adminBanner.backLong')}</span>
              </button>
            </div>
          )}
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="font-serif italic text-lg" style={{ color: '#8A7A5C' }}>{t('common.loading')}</div>
              </div>
            }>
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
                            onResetUserPassword={(user) => notify({
                              title: t('app.notify.resetPwdTitle'),
                              message: t('app.notify.resetPwdBody', { name: user.name }),
                            })}
                            onLogout={handleLogout} />
            )}
            {view === 'dashboard' && currentOrg && (
              <Dashboard cats={orgCats} colonies={orgColonies} events={orgEvents}
                         reminders={orgReminders}
                         templates={orgTemplates} shifts={orgShifts} members={orgMembers}
                         onNavigate={onNav} />
            )}
            {view === 'colonies' && currentOrg && (
              <ColoniesView colonies={orgColonies} cats={orgCats}
                            onSelect={(id) => onNav('colony', id)}
                            onAdd={() => can(currentRole, 'add_colony') ? setModal('addColony') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermColony') })} />
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
                            onAddCat={() => can(currentRole, 'add_cat') ? setModal('addCat') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermGeneric') })}
                            onEdit={() => can(currentRole, 'edit_colony') ? setModal('editColony') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermGeneric') })}
                            onDelete={deleteColony}
                            canEdit={can(currentRole, 'edit_colony')}
                            canDelete={can(currentRole, 'delete_colony')}
                            canAddCat={can(currentRole, 'add_cat')} />
            )}
            {view === 'cats' && currentOrg && (
              <CatsView cats={orgCats} colonies={orgColonies}
                        onSelect={(id) => onNav('cat', id)}
                        onAdd={() => can(currentRole, 'add_cat') ? setModal('addCat') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermCat') })}
                        filter={filter} setFilter={setFilter} />
            )}
            {view === 'cat' && currentCat && (
              <CatDetail cat={currentCat} colony={currentCatColony} events={events}
                         reminders={orgReminders} members={orgMembers}
                         onBack={() => setView(selectedColony && currentCat.colonyId === selectedColony ? 'colony' : 'cats')}
                         onEdit={() => can(currentRole, 'edit_cat') ? setModal('editCat') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermGeneric') })}
                         onAddEvent={() => can(currentRole, 'add_event') ? setModal('addEvent') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermGeneric') })}
                         onEditEvent={(event) => can(currentRole, 'edit_event') ? setModal({ type: 'editEvent', event }) : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermGeneric') })}
                         onDelete={deleteCat}
                         onChangeStatus={changeCatStatus}
                         onAddReminder={() => can(currentRole, 'add_event') ? setModal('addReminder') : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermReminder') })}
                         onEditReminder={(reminder) => setModal({ type: 'editReminder', reminder })}
                         onDeleteReminder={deleteCatReminder}
                         onCompleteReminder={completeCatReminder}
                         onUncompleteReminder={uncompleteCatReminder}
                         canEdit={can(currentRole, 'edit_cat')}
                         canDelete={can(currentRole, 'delete_cat')}
                         canAddEvent={can(currentRole, 'add_event')}
                         canEditEvent={can(currentRole, 'edit_event')}
                         canChangeStatus={can(currentRole, 'change_status')}
                         canManageReminders={can(currentRole, 'add_event')}
                         canDeleteReminders={isSuperAdmin || currentRole === 'admin' || currentRole === 'coordinator'} />
            )}
            {view === 'calendar' && currentOrg && (
              <CalendarView templates={orgTemplates} shifts={orgShifts}
                            colonies={orgColonies} members={orgMembers}
                            users={users}
                            currentUser={currentUser} currentRole={currentRole}
                            onSelectShift={(s) => { setSelectedShift(s); setModal('viewShift'); }}
                            onAddTemplate={() => can(currentRole, 'manage_shifts')
                              ? (setSelectedTemplate(null), setModal('addTemplate'))
                              : notify({ title: t('app.notify.noPermTitle'), message: t('app.notify.noPermShifts') })}
                            onEditTemplate={(tpl) => { setSelectedTemplate(tpl); setModal('editTemplate'); }} />
            )}
            {view === 'settings' && currentOrg && (
              <SettingsView currentOrg={currentOrg} currentUser={currentUser} currentRole={currentRole}
                            members={orgMembers}
                            onEditOrg={() => setModal('editOrg')}
                            onAddMember={handleAddMember}
                            onRemoveMember={handleRemoveMember}
                            onChangeRole={handleChangeRole}
                            onResetMemberPassword={(member) => notify({
                              title: t('app.notify.resetPwdTitle'),
                              message: t('app.notify.resetPwdBody', { name: member.name }),
                            })}
                            onChangeMyPassword={() => setModal('changeMyPassword')}
                            onLogout={handleLogout}
                            onLeaveOrg={handleLeaveOrg}
                            onDeleteOrg={handleDeleteOrg}
                            onResetData={handleResetData} />
            )}
            </Suspense>
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
          users={users}
          currentColony={currentColony} currentCat={currentCat}
          notify={notify}
          saveColony={saveColony}
          saveCat={saveCat}
          saveEvent={saveEvent}
          saveCatReminder={saveCatReminder}
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
