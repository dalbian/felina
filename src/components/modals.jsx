// Modales globales de la app. Se renderizan siempre dentro de la rama principal
// y se muestran según el valor de `modal` del store. Vivir aquí en lugar de
// App.jsx mantiene el orquestador centrado en routing/layout.

import { Modal } from './ui.jsx';
import { ColonyForm } from './colonies.jsx';
import { CatForm, EventForm } from './cats.jsx';
import { OrgForm } from './settings.jsx';
import { ChangePasswordForm, ResetPasswordForm } from './auth.jsx';
import { ShiftTemplateForm, ShiftAssignForm, ShiftDetailView } from './calendar.jsx';
import { can } from '../lib/permissions.js';

// Todo el estado y los handlers vienen del store a través de props. El componente
// podría consumir el store por Context directamente, pero props explícitos
// facilitan el testing y dejan clara la dependencia real.
export const GlobalModals = ({
  // estado
  modal, setModal,
  selectedColony, selectedCat, selectedShift, selectedTemplate,
  setSelectedShift, setSelectedTemplate,
  currentOrg, currentUser, currentRole,
  orgColonies, orgMembers, orgTemplates,
  currentColony, currentCat,
  // datos
  notify,
  // handlers de organización y datos
  saveColony,
  saveCat,
  saveEvent,
  handleCreateNewOrg, handleEditOrg,
  handlePlatformCreateOrg, handlePlatformEditOrg,
  handleChangeMyPassword, handleResetPassword,
  // handlers de turnos
  saveShiftTemplate, deleteShiftTemplate,
  claimShift, unclaimShift, completeShift, uncompleteShift, assignShiftTo,
}) => (
  <>
    <Modal open={modal === 'addColony' || modal?.type === 'addColony'} onClose={() => setModal(null)} title="Nueva colonia">
      <ColonyForm
        colony={modal?.type === 'addColony' && modal.prefill
          ? { name: '', address: '', cuidadores: '', notes: '', lat: modal.prefill.lat, lng: modal.prefill.lng }
          : undefined}
        fromMap={modal?.type === 'addColony' && !!modal.prefill}
        onSave={saveColony} onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal === 'editColony'} onClose={() => setModal(null)} title="Editar colonia">
      {currentColony && <ColonyForm colony={currentColony} onSave={saveColony} onCancel={() => setModal(null)} />}
    </Modal>

    <Modal open={modal === 'addCat'} onClose={() => setModal(null)} title="Nuevo gato">
      <CatForm colonies={orgColonies}
               onSave={(f) => saveCat({ ...f, colonyId: f.colonyId || selectedColony || orgColonies[0]?.id })}
               onCancel={() => setModal(null)} onError={notify} />
    </Modal>
    <Modal open={modal === 'editCat'} onClose={() => setModal(null)} title="Editar gato">
      {currentCat && <CatForm cat={currentCat} colonies={orgColonies} onSave={saveCat} onCancel={() => setModal(null)} onError={notify} />}
    </Modal>
    <Modal open={modal === 'addEvent'} onClose={() => setModal(null)} title="Nuevo evento veterinario">
      <EventForm onSave={saveEvent} onCancel={() => setModal(null)} />
    </Modal>

    <Modal open={modal === 'createOrg'} onClose={() => setModal(null)} title="Nueva organización">
      <OrgForm onSave={handleCreateNewOrg} onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal === 'editOrg'} onClose={() => setModal(null)} title="Editar organización">
      <OrgForm org={currentOrg} onSave={handleEditOrg} onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal === 'platformCreateOrg'} onClose={() => setModal(null)} title="Crear organización desde plataforma">
      <OrgForm onSave={handlePlatformCreateOrg} onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal?.type === 'platformEditOrg'} onClose={() => setModal(null)} title="Editar organización">
      {modal?.org && <OrgForm org={modal.org} onSave={(data) => handlePlatformEditOrg({ ...modal.org, ...data })} onCancel={() => setModal(null)} />}
    </Modal>

    <Modal open={modal === 'changeMyPassword'} onClose={() => setModal(null)} title="Cambiar contraseña">
      <ChangePasswordForm onSave={handleChangeMyPassword} onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal?.type === 'resetPassword'} onClose={() => setModal(null)} title="Restablecer contraseña">
      {modal?.type === 'resetPassword' && (
        <ResetPasswordForm
          targetName={modal.userName}
          onSave={(data) => handleResetPassword(modal.userId, data)}
          onCancel={() => setModal(null)} />
      )}
    </Modal>

    <Modal open={modal === 'addTemplate'} onClose={() => setModal(null)} title="Nueva plantilla de turno">
      <ShiftTemplateForm colonies={orgColonies}
                         onSave={saveShiftTemplate}
                         onCancel={() => setModal(null)} />
    </Modal>
    <Modal open={modal === 'editTemplate'} onClose={() => { setModal(null); setSelectedTemplate(null); }} title="Editar plantilla de turno">
      {selectedTemplate && (
        <ShiftTemplateForm template={selectedTemplate} colonies={orgColonies}
                           onSave={saveShiftTemplate}
                           onCancel={() => { setModal(null); setSelectedTemplate(null); }}
                           onDelete={() => deleteShiftTemplate(selectedTemplate.id)}
                           canDelete={can(currentRole, 'manage_shifts')} />
      )}
    </Modal>
    <Modal open={modal === 'viewShift'} onClose={() => { setModal(null); setSelectedShift(null); }} title="Detalle del turno">
      {selectedShift && (
        <ShiftDetailView shift={selectedShift}
                         colony={orgColonies.find(c => c.id === selectedShift.colonyId)}
                         assignee={selectedShift.assigneeId ? orgMembers.find(m => m.userId === selectedShift.assigneeId) : null}
                         completedBy={selectedShift.completedBy ? orgMembers.find(m => m.userId === selectedShift.completedBy) : null}
                         currentUser={currentUser} currentRole={currentRole}
                         onClaim={() => claimShift(selectedShift)}
                         onUnclaim={() => unclaimShift(selectedShift)}
                         onComplete={() => completeShift(selectedShift)}
                         onUncomplete={() => uncompleteShift(selectedShift)}
                         onAssign={() => setModal('assignShift')}
                         onEditTemplate={() => {
                           const tpl = orgTemplates.find(t => t.id === selectedShift.templateId);
                           if (tpl) { setSelectedTemplate(tpl); setModal('editTemplate'); }
                         }}
                         onClose={() => { setModal(null); setSelectedShift(null); }} />
      )}
    </Modal>
    <Modal open={modal === 'assignShift'} onClose={() => setModal('viewShift')} title="Asignar turno">
      {selectedShift && (
        <ShiftAssignForm shift={selectedShift}
                         colony={orgColonies.find(c => c.id === selectedShift.colonyId)}
                         members={orgMembers}
                         onSave={(userId) => assignShiftTo(selectedShift, userId)}
                         onCancel={() => setModal('viewShift')} />
      )}
    </Modal>
  </>
);
