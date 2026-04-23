// Store central de la aplicación. Encapsula todo el estado de datos (orgs,
// usuarios, colonias, gatos, eventos, turnos), el estado de UI (sesión, vista
// activa, selecciones, modales), las migraciones de arranque y todos los
// handlers (auth, CRUD, permisos, plataforma).
//
// App.jsx consume este hook y pasa a los componentes los datos + handlers
// que cada uno necesita. Mantener aquí la lógica permite:
//   - testear cada handler aislado con el time (cuando toque tests con jsdom).
//   - migrar a backend cambiando un único sitio (este fichero orquesta todas
//     las lecturas/escrituras contra storage.js).
//   - evitar que App.jsx crezca sin control.

import { useState, useEffect } from 'react';

import { uid } from '../lib/ids.js';
import { load, save, STORAGE_PREFIX } from '../lib/storage.js';
import { normalizeEmail, isValidEmail, validatePassword } from '../lib/auth.js';
import { can } from '../lib/permissions.js';
import { sampleData } from '../lib/seed.js';
import { slotFromTime } from '../lib/shifts.js';

export function useFelinaStore() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null); // { userId, orgId }
  const [rgpdAcknowledged, setRgpdAcknowledged] = useState(true); // optimista: evita parpadeo

  // Datos globales
  const [organizations, setOrganizations] = useState([]);
  const [users, setUsers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [colonies, setColonies] = useState([]);
  const [cats, setCats] = useState([]);
  const [events, setEvents] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [shifts, setShifts] = useState([]);

  // UI
  const [view, setView] = useState('dashboard');
  const [selectedColony, setSelectedColony] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');

  // Diálogos propios (en sustitución de window.confirm y window.alert nativos,
  // que algunas usuarias confundían con errores del navegador). El mismo
  // componente <ConfirmDialog/> se usa en ambos modos; aquí dos funciones
  // distintas para dos usos distintos:
  //   - confirmAsync({...}) → Promise<boolean>   (dos botones: sí/no)
  //   - notify({...})       → Promise<void>      (un botón informativo)
  // App.jsx renderiza el diálogo cuando confirmState está poblado y llama a
  // resolveConfirm al cerrarlo (con true/false o con undefined para notify).
  const [confirmState, setConfirmState] = useState(null);
  const confirmAsync = (options) => new Promise((resolve) => {
    setConfirmState({ ...options, resolver: resolve, isNotify: false });
  });
  const notify = (options) => new Promise((resolve) => {
    setConfirmState({
      confirmLabel: 'Entendido',
      destructive: false,
      tone: 'warning',
      ...options,
      resolver: resolve,
      isNotify: true,
    });
  });
  const resolveConfirm = (result) => {
    if (confirmState?.resolver) confirmState.resolver(confirmState.isNotify ? undefined : result);
    setConfirmState(null);
  };

  // ───── Carga inicial + migraciones ─────
  useEffect(() => {
    (async () => {
      const orgsData = await load('organizations');
      if (!orgsData) {
        const s = sampleData();
        setOrganizations(s.organizations); setUsers(s.users); setMemberships(s.memberships);
        setColonies(s.colonies); setCats(s.cats); setEvents(s.events);
        setShiftTemplates(s.shiftTemplates); setShifts(s.shifts);
        await save('organizations', s.organizations);
        await save('users', s.users);
        await save('memberships', s.memberships);
        await save('colonies', s.colonies);
        await save('cats', s.cats);
        await save('events', s.events);
        await save('shiftTemplates', s.shiftTemplates);
        await save('shifts', s.shifts);
      } else {
        let usersData = (await load('users')) || [];
        let orgsData2 = orgsData;

        // Migración 1: asegurar que existe al menos un superadmin
        if (!usersData.some(u => u.superAdmin)) {
          const superAdmin = { id: 'u0', name: 'Aina Roca', email: 'aina@felina.app', password: 'demo1234', color: '#8A6B1F', superAdmin: true, createdAt: Date.now() };
          usersData = [superAdmin, ...usersData];
          await save('users', usersData);
        }

        // Migración 4: asegurar que todos los usuarios tienen password (prototipo: demo1234)
        if (usersData.some(u => !u.password)) {
          usersData = usersData.map(u => u.password ? u : { ...u, password: 'demo1234' });
          await save('users', usersData);
        }

        // Migración 2: asegurar que las orgs tienen campo `suspended`
        if (orgsData2.some(o => o.suspended === undefined)) {
          orgsData2 = orgsData2.map(o => ({ ...o, suspended: o.suspended === true }));
          await save('organizations', orgsData2);
        }

        setOrganizations(orgsData2);
        setUsers(usersData);
        setMemberships((await load('memberships')) || []);
        setColonies((await load('colonies')) || []);
        setCats((await load('cats')) || []);
        setEvents((await load('events')) || []);

        // Migración 3: turnos y plantillas pueden no existir en instalaciones previas
        let savedTemplates = await load('shiftTemplates');
        let savedShifts = await load('shifts');

        // Migración 5: el calendario pasó de "hora exacta" a "franja" (mañana/tarde).
        // Convertimos los `time: 'HH:MM'` heredados a `slot` para no perder programación.
        if (Array.isArray(savedTemplates) && savedTemplates.some(t => !t.slot)) {
          savedTemplates = savedTemplates.map(t => t.slot ? t : { ...t, slot: slotFromTime(t.time) });
          await save('shiftTemplates', savedTemplates);
        }
        if (Array.isArray(savedShifts) && savedShifts.some(s => !s.slot)) {
          savedShifts = savedShifts.map(s => s.slot ? s : { ...s, slot: slotFromTime(s.time) });
          await save('shifts', savedShifts);
        }

        setShiftTemplates(savedTemplates || []);
        setShifts(savedShifts || []);
        if (!savedTemplates) await save('shiftTemplates', []);
        if (!savedShifts) await save('shifts', []);
      }
      const savedSession = await load('session');
      setSession(savedSession);
      if (savedSession?.userId) {
        const ack = await load('rgpdAck:' + savedSession.userId);
        setRgpdAcknowledged(ack === true);
      }
      setLoading(false);
    })();
  }, []);

  // Cuando cambia el usuario de la sesión (login nuevo), recargar el flag RGPD.
  useEffect(() => {
    if (!session?.userId) return;
    (async () => {
      const ack = await load('rgpdAck:' + session.userId);
      setRgpdAcknowledged(ack === true);
    })();
  }, [session?.userId]);

  const handleAcceptRgpd = async () => {
    if (!session?.userId) return;
    await save('rgpdAck:' + session.userId, true);
    setRgpdAcknowledged(true);
  };

  // ───── Derivados: usuario, org, rol, permisos ─────
  const currentUser = users.find(u => u.id === session?.userId);
  const currentOrg = organizations.find(o => o.id === session?.orgId);
  const isSuperAdmin = currentUser?.superAdmin === true;
  const realMembership = memberships.find(m => m.userId === session?.userId && m.orgId === session?.orgId);
  // Si es superadmin dentro de una org sin pertenencia real, le damos permisos de admin efectivos
  const currentRole = realMembership?.role || (isSuperAdmin && currentOrg ? 'admin' : undefined);

  // Filtrado por organización
  const orgColonies = colonies.filter(c => c.orgId === session?.orgId);
  const orgCats = cats.filter(c => c.orgId === session?.orgId);
  const orgCatIds = new Set(orgCats.map(c => c.id));
  const orgEvents = events.filter(e => orgCatIds.has(e.catId));
  const orgTemplates = shiftTemplates.filter(t => t.orgId === session?.orgId);
  const orgShifts = shifts.filter(s => s.orgId === session?.orgId);

  // Orgs del usuario actual (superadmin ve todas)
  const userOrgs = isSuperAdmin
    ? organizations.map(o => ({ org: o, role: 'admin' }))
    : memberships
        .filter(m => m.userId === session?.userId)
        .map(m => ({ org: organizations.find(o => o.id === m.orgId), role: m.role }))
        .filter(x => x.org);

  // Miembros de la org actual
  const orgMembers = memberships
    .filter(m => m.orgId === session?.orgId)
    .map(m => {
      const u = users.find(x => x.id === m.userId);
      return u ? { ...u, userId: u.id, role: m.role, membershipId: m.id } : null;
    })
    .filter(Boolean);

  // ───── Autenticación ─────
  // Devuelve null si el login ha ido bien, o un mensaje de error en caso contrario.
  const handleLogin = async (email, password) => {
    const user = users.find(u => u.email?.toLowerCase() === email);
    if (!user || user.password !== password) return 'Email o contraseña incorrectos.';
    if (user.superAdmin) {
      const newSession = { userId: user.id, orgId: null };
      setSession(newSession); await save('session', newSession);
      setView('platform');
      return null;
    }
    const userMems = memberships.filter(m => m.userId === user.id);
    if (userMems.length === 0) return 'Este usuario no pertenece a ninguna organización.';
    const newSession = { userId: user.id, orgId: userMems[0].orgId };
    setSession(newSession); await save('session', newSession);
    setView('dashboard');
    return null;
  };

  const handleLogout = async () => {
    setSession(null); await save('session', null);
    setView('dashboard'); setSelectedCat(null); setSelectedColony(null);
  };

  // Pieza temporal de la fase piloto: borra todo el estado persistido en este
  // navegador (claves felina:*) y recarga para resembrar los datos de demo.
  const handleResetData = async () => {
    const ok = await confirmAsync({
      title: 'Reiniciar datos de prueba',
      message: 'Se perderán todas las organizaciones, colonias, gatos, eventos y turnos guardados en este navegador. Solo afecta a este dispositivo y no se puede deshacer.',
      confirmLabel: 'Sí, reiniciar todo',
      destructive: true,
    });
    if (!ok) return;
    try {
      const keys = Object.keys(window.localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      keys.forEach(k => window.localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  };

  const handleCreateNewOrg = async ({ name, city, contactEmail }) => {
    const newOrg = { id: uid(), name, city, contactEmail, color: '#2D4A3E', createdAt: Date.now() };
    const newMem = { id: uid(), userId: session.userId, orgId: newOrg.id, role: 'admin', joinedAt: Date.now() };
    const newOrgs = [...organizations, newOrg];
    const newMems = [...memberships, newMem];
    setOrganizations(newOrgs); setMemberships(newMems);
    await save('organizations', newOrgs); await save('memberships', newMems);
    const newSession = { ...session, orgId: newOrg.id };
    setSession(newSession); await save('session', newSession);
    setView('dashboard'); setModal(null);
  };

  const handleSwitchOrg = async (orgId) => {
    const newSession = { ...session, orgId };
    setSession(newSession); await save('session', newSession);
    setView('dashboard'); setSelectedCat(null); setSelectedColony(null);
  };

  // ───── Gestión de miembros ─────
  const handleAddMember = async ({ name, email, password, role }) => {
    if (currentRole !== 'admin') return { error: 'No tienes permisos para añadir miembros.' };
    const normEmail = normalizeEmail(email);
    if (!normEmail || !isValidEmail(normEmail)) return { error: 'Email no válido.' };
    const pwErr = validatePassword(password);
    if (pwErr) return { error: pwErr };
    if (users.some(u => normalizeEmail(u.email) === normEmail)) {
      return { error: 'Ya existe una cuenta con ese email.' };
    }
    const colors = ['#2D4A3E', '#B15A3A', '#7B6EA8', '#7A541F', '#4E4375', '#6B8E4E'];
    const user = { id: uid(), name: name.trim(), email: normEmail, password, color: colors[users.length % colors.length], createdAt: Date.now() };
    const newUsers = [...users, user];
    const newMem = { id: uid(), userId: user.id, orgId: session.orgId, role, joinedAt: Date.now() };
    const newMems = [...memberships, newMem];
    setUsers(newUsers); setMemberships(newMems);
    await save('users', newUsers); await save('memberships', newMems);
    return { ok: true };
  };

  const handleChangeMyPassword = async ({ current, next }) => {
    const me = users.find(u => u.id === session?.userId);
    if (!me) return { error: 'No hay sesión activa.' };
    if (me.password !== current) return { error: 'La contraseña actual no es correcta.' };
    const newUsers = users.map(u => u.id === me.id ? { ...u, password: next } : u);
    setUsers(newUsers); await save('users', newUsers);
    setModal(null);
    return { ok: true };
  };

  const handleResetPassword = async (targetUserId, { next }) => {
    const target = users.find(u => u.id === targetUserId);
    if (!target) return { error: 'Usuario no encontrado.' };
    if (target.id === session?.userId) return { error: 'Usa "Cambiar contraseña" para tu propia cuenta.' };

    if (isSuperAdmin) {
      if (target.superAdmin) return { error: 'No puedes restablecer la contraseña de otro superadministrador.' };
    } else {
      if (currentRole !== 'admin') return { error: 'No tienes permisos.' };
      const shares = memberships.some(m => m.userId === targetUserId && m.orgId === session.orgId);
      if (!shares) return { error: 'Este usuario no pertenece a tu organización.' };
      if (target.superAdmin) return { error: 'No puedes restablecer la contraseña de un superadministrador.' };
    }

    const newUsers = users.map(u => u.id === targetUserId ? { ...u, password: next } : u);
    setUsers(newUsers); await save('users', newUsers);
    setModal(null);
    return { ok: true };
  };

  const handleRemoveMember = async (userId) => {
    const target = users.find(u => u.id === userId);
    const ok = await confirmAsync({
      title: 'Expulsar miembro',
      message: `Vas a expulsar a ${target?.name || 'este miembro'} de la organización. Perderá el acceso pero su histórico se conserva.`,
      confirmLabel: 'Expulsar',
      destructive: true,
    });
    if (!ok) return;
    const newMems = memberships.filter(m => !(m.userId === userId && m.orgId === session.orgId));
    setMemberships(newMems); await save('memberships', newMems);
  };

  const handleChangeRole = async (userId, role) => {
    const newMems = memberships.map(m =>
      m.userId === userId && m.orgId === session.orgId ? { ...m, role } : m
    );
    setMemberships(newMems); await save('memberships', newMems);
  };

  const handleEditOrg = async (data) => {
    const newOrgs = organizations.map(o => o.id === session.orgId ? { ...o, ...data } : o);
    setOrganizations(newOrgs); await save('organizations', newOrgs); setModal(null);
  };

  const handleLeaveOrg = async () => {
    const ok = await confirmAsync({
      title: 'Salir de la organización',
      message: 'Dejarás de tener acceso a las colonias, gatos y turnos de esta organización. La administración tendrá que volver a invitarte si quieres entrar de nuevo.',
      confirmLabel: 'Sí, salir',
      destructive: true,
    });
    if (!ok) return;
    const newMems = memberships.filter(m => !(m.userId === session.userId && m.orgId === session.orgId));
    setMemberships(newMems); await save('memberships', newMems);
    const other = newMems.find(m => m.userId === session.userId);
    if (other) { await handleSwitchOrg(other.orgId); }
    else { await handleLogout(); }
  };

  const handleDeleteOrg = async () => {
    const stats = {
      cols: colonies.filter(c => c.orgId === session.orgId).length,
      cats: cats.filter(c => c.orgId === session.orgId).length,
      mems: memberships.filter(m => m.orgId === session.orgId).length,
    };
    const ok = await confirmAsync({
      title: `Eliminar "${currentOrg.name}"`,
      message: `Se borrarán definitivamente ${stats.cols} colonia${stats.cols !== 1 ? 's' : ''}, ${stats.cats} gato${stats.cats !== 1 ? 's' : ''} con todo su historial veterinario, y ${stats.mems} miembro${stats.mems !== 1 ? 's' : ''}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar definitivamente',
      destructive: true,
    });
    if (!ok) return;
    const orgId = session.orgId;
    const toDeleteCats = cats.filter(c => c.orgId === orgId).map(c => c.id);
    const newOrgs = organizations.filter(o => o.id !== orgId);
    const newMems = memberships.filter(m => m.orgId !== orgId);
    const newColonies = colonies.filter(c => c.orgId !== orgId);
    const newCats = cats.filter(c => c.orgId !== orgId);
    const newEvents = events.filter(e => !toDeleteCats.includes(e.catId));
    setOrganizations(newOrgs); setMemberships(newMems);
    setColonies(newColonies); setCats(newCats); setEvents(newEvents);
    await save('organizations', newOrgs); await save('memberships', newMems);
    await save('colonies', newColonies); await save('cats', newCats); await save('events', newEvents);
    const other = newMems.find(m => m.userId === session.userId);
    if (other) { await handleSwitchOrg(other.orgId); }
    else { await handleLogout(); }
  };

  // ───── Gestión de plataforma (superadmin) ─────
  const handlePlatformCreateOrg = async ({ name, city, contactEmail }) => {
    const newOrg = { id: uid(), name, city, contactEmail, color: '#2D4A3E', suspended: false, createdAt: Date.now() };
    const newOrgs = [...organizations, newOrg];
    setOrganizations(newOrgs); await save('organizations', newOrgs);
    setModal(null);
  };

  const handlePlatformDeleteOrg = async (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;
    const stats = {
      cols: colonies.filter(c => c.orgId === orgId).length,
      cats: cats.filter(c => c.orgId === orgId).length,
      mems: memberships.filter(m => m.orgId === orgId).length,
    };
    const ok = await confirmAsync({
      title: `Eliminar "${org.name}"`,
      message: `Como superadministración, vas a borrar esta organización con ${stats.mems} miembro${stats.mems !== 1 ? 's' : ''}, ${stats.cols} colonia${stats.cols !== 1 ? 's' : ''} y ${stats.cats} gato${stats.cats !== 1 ? 's' : ''}. La acción es irreversible.`,
      confirmLabel: 'Eliminar definitivamente',
      destructive: true,
    });
    if (!ok) return;
    const toDeleteCats = cats.filter(c => c.orgId === orgId).map(c => c.id);
    const newOrgs = organizations.filter(o => o.id !== orgId);
    const newMems = memberships.filter(m => m.orgId !== orgId);
    const newColonies = colonies.filter(c => c.orgId !== orgId);
    const newCats = cats.filter(c => c.orgId !== orgId);
    const newEvents = events.filter(e => !toDeleteCats.includes(e.catId));
    setOrganizations(newOrgs); setMemberships(newMems);
    setColonies(newColonies); setCats(newCats); setEvents(newEvents);
    await save('organizations', newOrgs); await save('memberships', newMems);
    await save('colonies', newColonies); await save('cats', newCats); await save('events', newEvents);
    if (session.orgId === orgId) {
      const newSession = { ...session, orgId: null };
      setSession(newSession); await save('session', newSession);
      setView('platform');
    }
  };

  const handlePlatformSuspendOrg = async (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;
    const newSuspended = !org.suspended;
    if (newSuspended) {
      const ok = await confirmAsync({
        title: `Suspender "${org.name}"`,
        message: 'Mientras esté suspendida, sus miembros no podrán acceder a sus datos. Podrás reactivarla en cualquier momento sin perder nada.',
        confirmLabel: 'Suspender',
        destructive: false,
      });
      if (!ok) return;
    }
    const newOrgs = organizations.map(o => o.id === orgId ? { ...o, suspended: newSuspended } : o);
    setOrganizations(newOrgs); await save('organizations', newOrgs);
  };

  const handlePlatformEditOrg = async (data) => {
    const newOrgs = organizations.map(o => o.id === data.id ? { ...o, ...data } : o);
    setOrganizations(newOrgs); await save('organizations', newOrgs);
    setModal(null);
  };

  const handleToggleSuperAdmin = async (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (user.superAdmin && users.filter(u => u.superAdmin).length === 1) {
      await notify({ title: 'Es el único superadministrador', message: 'Antes de retirarle los permisos, concede superadmin a otra persona. Si no, nadie podría administrar la plataforma.' }); return;
    }
    const ok = await confirmAsync({
      title: user.superAdmin ? `Retirar permisos a ${user.name}` : `Dar permisos a ${user.name}`,
      message: user.superAdmin
        ? 'Dejará de tener acceso a la administración global de la plataforma. Mantendrá sus pertenencias en cada organización.'
        : 'Pasará a poder ver y gestionar todas las organizaciones de la plataforma. Concédelo solo a personas de máxima confianza.',
      confirmLabel: user.superAdmin ? 'Retirar' : 'Conceder',
      destructive: user.superAdmin,
    });
    if (!ok) return;
    const newUsers = users.map(u => u.id === userId ? { ...u, superAdmin: !u.superAdmin } : u);
    setUsers(newUsers); await save('users', newUsers);
  };

  const handleExitToPlatform = async () => {
    const newSession = { ...session, orgId: null };
    setSession(newSession); await save('session', newSession);
    setView('platform'); setSelectedCat(null); setSelectedColony(null);
  };

  const handleEnterOrgAsSuperAdmin = async (orgId) => {
    const newSession = { ...session, orgId };
    setSession(newSession); await save('session', newSession);
    setView('dashboard'); setSelectedCat(null); setSelectedColony(null);
  };

  // ───── Datos (colonias, gatos, eventos) ─────
  // Guardas defensivas: en edición y borrado se verifica que el registro pertenece
  // a la org activa y se fuerza el orgId original para que un form manipulado no
  // pueda moverlo a otra organización. Útil cuando migremos a backend.
  const saveColony = async (form) => {
    if (!can(currentRole, form.id ? 'edit_colony' : 'add_colony')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    let updated;
    if (form.id) {
      const existing = colonies.find(c => c.id === form.id);
      if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Esta colonia no pertenece a la organización activa.' }); return; }
      updated = colonies.map(c => c.id === form.id ? { ...c, ...form, orgId: c.orgId } : c);
    } else {
      updated = [...colonies, { ...form, id: uid(), orgId: session.orgId, createdAt: Date.now() }];
    }
    setColonies(updated); await save('colonies', updated); setModal(null);
  };

  const deleteColony = async () => {
    if (!selectedColony || !can(currentRole, 'delete_colony')) { await notify({ title: 'Sin permiso', message: 'Solo administración o coordinación pueden eliminar colonias.' }); return; }
    const existing = colonies.find(c => c.id === selectedColony);
    if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Esta colonia no pertenece a la organización activa.' }); return; }
    if (cats.some(c => c.colonyId === selectedColony)) {
      await notify({ title: 'Esta colonia tiene gatos', message: 'Antes de eliminar la colonia, mueve sus gatos a otra o elimínalos desde su ficha.' }); return;
    }
    const ok = await confirmAsync({
      title: `Eliminar colonia "${existing.name}"`,
      message: 'La colonia desaparecerá del listado y del mapa. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const updated = colonies.filter(c => c.id !== selectedColony);
    setColonies(updated); await save('colonies', updated);
    setSelectedColony(null); setView('colonies');
  };

  const saveCat = async (form) => {
    if (!can(currentRole, form.id ? 'edit_cat' : 'add_cat')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    let updated;
    if (form.id) {
      const existing = cats.find(c => c.id === form.id);
      if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' }); return; }
      updated = cats.map(c => c.id === form.id ? { ...c, ...form, orgId: c.orgId } : c);
    } else {
      updated = [...cats, { ...form, id: uid(), orgId: session.orgId, createdAt: Date.now() }];
    }
    setCats(updated); await save('cats', updated); setModal(null);
  };

  const deleteCat = async () => {
    if (!selectedCat || !can(currentRole, 'delete_cat')) { await notify({ title: 'Sin permiso', message: 'Solo administración o coordinación pueden eliminar fichas de gato.' }); return; }
    const existing = cats.find(c => c.id === selectedCat);
    if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' }); return; }
    const eventCount = events.filter(e => e.catId === selectedCat).length;
    const ok = await confirmAsync({
      title: `Eliminar a ${existing.name}`,
      message: eventCount > 0
        ? `Se borrará la ficha y los ${eventCount} evento${eventCount !== 1 ? 's' : ''} veterinario${eventCount !== 1 ? 's' : ''} asociado${eventCount !== 1 ? 's' : ''}. Esta acción no se puede deshacer.`
        : 'Se borrará la ficha completa. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar gato',
      destructive: true,
    });
    if (!ok) return;
    const updatedCats = cats.filter(c => c.id !== selectedCat);
    const updatedEvents = events.filter(e => e.catId !== selectedCat);
    setCats(updatedCats); setEvents(updatedEvents);
    await save('cats', updatedCats); await save('events', updatedEvents);
    setSelectedCat(null); setView('cats');
  };

  const changeCatStatus = async (status) => {
    if (!can(currentRole, 'change_status')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const existing = cats.find(c => c.id === selectedCat);
    if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' }); return; }
    const updated = cats.map(c => c.id === selectedCat ? { ...c, cerStatus: status } : c);
    setCats(updated); await save('cats', updated);
  };

  const saveEvent = async (form) => {
    if (!can(currentRole, 'add_event')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const cat = cats.find(c => c.id === selectedCat);
    if (!cat || cat.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' }); return; }
    const updated = [...events, { ...form, id: uid(), catId: selectedCat }];
    setEvents(updated); await save('events', updated); setModal(null);
  };

  // ───── Datos (calendario: plantillas y turnos) ─────
  const saveShiftTemplate = async (form) => {
    if (!can(currentRole, 'manage_shifts')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    let updated;
    if (form.id) {
      const existing = shiftTemplates.find(t => t.id === form.id);
      if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Esta plantilla no pertenece a la organización activa.' }); return; }
      updated = shiftTemplates.map(t => t.id === form.id ? { ...t, ...form, orgId: t.orgId } : t);
    } else {
      updated = [...shiftTemplates, { ...form, id: uid(), orgId: session.orgId, createdAt: Date.now() }];
    }
    setShiftTemplates(updated); await save('shiftTemplates', updated);
    setModal(null); setSelectedTemplate(null);
  };

  const deleteShiftTemplate = async (templateId) => {
    if (!can(currentRole, 'manage_shifts')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const existing = shiftTemplates.find(t => t.id === templateId);
    if (!existing || existing.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Esta plantilla no pertenece a la organización activa.' }); return; }
    const ok = await confirmAsync({
      title: 'Eliminar plantilla de turno',
      message: 'Los turnos ya asignados o completados se conservan como registro histórico, pero no se generarán nuevos a partir de esta plantilla.',
      confirmLabel: 'Eliminar plantilla',
      destructive: true,
    });
    if (!ok) return;
    const updated = shiftTemplates.filter(t => t.id !== templateId);
    setShiftTemplates(updated); await save('shiftTemplates', updated);
    setModal(null); setSelectedTemplate(null);
  };

  // Materializa un turno virtual a real, o actualiza el existente. Devuelve el
  // turno persistido. El objeto retornado conserva `_template` (no se persiste,
  // solo para mantener el contexto visual).
  const upsertShift = async (virtualOrReal, patch) => {
    if (virtualOrReal.orgId !== session.orgId) { await notify({ title: 'Operación no válida', message: 'Este turno no pertenece a la organización activa.' }); return null; }
    let updated;
    let saved;
    if (virtualOrReal._virtual) {
      const real = {
        id: uid(),
        orgId: session.orgId,
        colonyId: virtualOrReal.colonyId,
        templateId: virtualOrReal.templateId,
        date: virtualOrReal.date,
        slot: virtualOrReal.slot || slotFromTime(virtualOrReal.time),
        task: virtualOrReal.task,
        assigneeId: null,
        status: 'open',
        notes: '',
        createdAt: Date.now(),
        ...patch,
      };
      updated = [...shifts, real];
      saved = { ...real, _template: virtualOrReal._template, _virtual: false };
    } else {
      const stored = { ...virtualOrReal, ...patch, orgId: virtualOrReal.orgId };
      delete stored._template; delete stored._virtual;
      updated = shifts.map(s => s.id === virtualOrReal.id ? stored : s);
      saved = { ...stored, _template: virtualOrReal._template, _virtual: false };
    }
    setShifts(updated); await save('shifts', updated);
    return saved;
  };

  const claimShift = async (shift) => {
    if (!can(currentRole, 'claim_shift')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const saved = await upsertShift(shift, { assigneeId: session.userId, status: 'assigned' });
    if (!saved) return;
    setSelectedShift(saved);
  };

  const unclaimShift = async (shift) => {
    const mine = shift.assigneeId === session.userId;
    if (!mine && !can(currentRole, 'assign_shift')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const saved = await upsertShift(shift, { assigneeId: null, status: 'open' });
    if (!saved) return;
    // Si el turno no tiene nada más (no notas, no completado), podemos borrarlo para dejarlo virtual
    if (!saved.notes && saved.status === 'open' && saved.templateId) {
      const cleaned = shifts.filter(s => s.id !== saved.id);
      setShifts(cleaned); await save('shifts', cleaned);
      setSelectedShift({ ...shift, _virtual: true, assigneeId: null, status: 'open' });
    } else {
      setSelectedShift(saved);
    }
  };

  const assignShiftTo = async (shift, userId) => {
    if (!can(currentRole, 'assign_shift')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const saved = await upsertShift(shift, { assigneeId: userId, status: 'assigned' });
    if (!saved) return;
    setSelectedShift(saved); setModal('viewShift');
  };

  const completeShift = async (shift) => {
    if (!can(currentRole, 'complete_shift')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const saved = await upsertShift(shift, {
      status: 'done',
      completedAt: Date.now(),
      completedBy: session.userId,
      assigneeId: shift.assigneeId || session.userId,
    });
    if (!saved) return;
    setSelectedShift(saved);
  };

  const uncompleteShift = async (shift) => {
    if (!can(currentRole, 'complete_shift')) { await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' }); return; }
    const saved = await upsertShift(shift, {
      status: shift.assigneeId ? 'assigned' : 'open',
      completedAt: null,
      completedBy: null,
    });
    if (!saved) return;
    setSelectedShift(saved);
  };

  const onNav = (key, id) => {
    if (key === 'colony') { setSelectedColony(id); setView('colony'); }
    else if (key === 'cat') { setSelectedCat(id); setView('cat'); }
    else { setView(key); }
  };

  return {
    // UI state
    loading, session, rgpdAcknowledged,
    view, setView,
    selectedColony, setSelectedColony,
    selectedCat, setSelectedCat,
    selectedShift, setSelectedShift,
    selectedTemplate, setSelectedTemplate,
    modal, setModal,
    filter, setFilter,
    confirmState, resolveConfirm,

    // Datos crudos
    organizations, users, memberships,
    colonies, cats, events,
    shiftTemplates, shifts,

    // Derivados
    currentUser, currentOrg, isSuperAdmin, realMembership, currentRole,
    orgColonies, orgCats, orgEvents, orgTemplates, orgShifts,
    userOrgs, orgMembers,

    // Handlers de sesión y RGPD
    handleAcceptRgpd,
    handleLogin, handleLogout, handleResetData,

    // Handlers de organización
    handleCreateNewOrg, handleSwitchOrg,
    handleEditOrg, handleLeaveOrg, handleDeleteOrg,

    // Handlers de miembros
    handleAddMember, handleRemoveMember, handleChangeRole,

    // Handlers de credenciales
    handleChangeMyPassword, handleResetPassword,

    // Handlers de plataforma (superadmin)
    handlePlatformCreateOrg, handlePlatformDeleteOrg,
    handlePlatformSuspendOrg, handlePlatformEditOrg,
    handleToggleSuperAdmin,
    handleExitToPlatform, handleEnterOrgAsSuperAdmin,

    // Handlers de datos
    saveColony, deleteColony,
    saveCat, deleteCat, changeCatStatus,
    saveEvent,
    saveShiftTemplate, deleteShiftTemplate,
    upsertShift,
    claimShift, unclaimShift, assignShiftTo, completeShift, uncompleteShift,

    // Navegación
    onNav,
  };
}
