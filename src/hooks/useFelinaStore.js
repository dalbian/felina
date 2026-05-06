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
import { supabase } from '../lib/supabaseClient.js';

// Mappers fila Postgres (snake_case) ↔ forma in-memory (camelCase) que ya
// consumen los componentes. Mantenerlos centralizados aquí evita reescribir
// la cadena de derivados (currentUser, userOrgs, orgMembers, etc.) durante
// la migración a backend.
//
// Las fechas (createdAt, joinedAt) las convertimos de ISO string a ms desde
// epoch para conservar la forma que esperaba el prototipo (Date.now()).
// Así helpers como fmtRelative, fmtDate, etc. siguen funcionando sin tocar.
const toMs = (s) => (s ? new Date(s).getTime() : 0);

const mapProfile = (row) => row && {
  id: row.id, name: row.name, email: row.email, color: row.color,
  superAdmin: row.super_admin === true, createdAt: toMs(row.created_at),
};
const mapOrg = (row) => row && {
  id: row.id, name: row.name, city: row.city,
  contactEmail: row.contact_email, color: row.color,
  suspended: row.suspended === true, createdAt: toMs(row.created_at),
};
const mapMembership = (row) => row && {
  id: row.id, userId: row.user_id, orgId: row.org_id,
  role: row.role, joinedAt: toMs(row.joined_at),
};
const mapColony = (row) => row && {
  id: row.id, orgId: row.org_id, name: row.name, address: row.address,
  lat: row.lat, lng: row.lng, cuidadores: row.cuidadores, notes: row.notes,
  createdAt: toMs(row.created_at),
};
const mapCat = (row) => row && {
  id: row.id, orgId: row.org_id, colonyId: row.colony_id,
  name: row.name, sex: row.sex, color: row.color,
  cerStatus: row.cer_status, notes: row.notes, signs: row.signs,
  microchip: row.microchip, age: row.age,
  createdAt: toMs(row.created_at),
};
const mapEvent = (row) => row && {
  id: row.id, catId: row.cat_id, orgId: row.org_id,
  type: row.type, date: toMs(row.date),
  vet: row.vet, cost: row.cost === null ? null : Number(row.cost),
  notes: row.notes,
};
const mapShiftTemplate = (row) => row && {
  id: row.id, orgId: row.org_id, colonyId: row.colony_id,
  daysOfWeek: row.days_of_week || [],
  slot: row.slot, task: row.task,
  active: row.active === true,
  createdAt: toMs(row.created_at),
};
// Postgres devuelve `date` como 'YYYY-MM-DD' (string) cuando es DATE puro.
// computeShifts() y la UI ya consumen ese formato → no convertimos a ms.
const mapShift = (row) => row && {
  id: row.id, orgId: row.org_id, colonyId: row.colony_id,
  templateId: row.template_id,
  date: row.date, slot: row.slot, task: row.task,
  assigneeId: row.assignee_id, status: row.status, notes: row.notes,
  completedAt: row.completed_at ? toMs(row.completed_at) : null,
  completedBy: row.completed_by,
  createdAt: toMs(row.created_at),
};

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

  // ───── Carga de datos visibles para el usuario autenticado ─────
  // RLS filtra automáticamente: super_admin ve todo, usuarios normales solo ven
  // sus orgs, sus memberships y las colonias de sus orgs. profiles es legible
  // por cualquier autenticado (lo necesitamos para resolver nombres de miembros).
  //
  // Devuelve { me, ownOrgIds } para que el llamador pueda decidir la vista y
  // la org por defecto sin esperar al re-render de React.
  const loadAuthenticatedData = async (userId, userEmail) => {
    const [meRes, profilesRes, orgsRes, membersRes, coloniesRes, catsRes, eventsRes, templatesRes, shiftsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('profiles').select('*'),
      supabase.from('organizations').select('*'),
      supabase.from('memberships').select('*'),
      supabase.from('colonies').select('*'),
      supabase.from('cats').select('*'),
      supabase.from('events').select('*'),
      supabase.from('shift_templates').select('*'),
      supabase.from('shifts').select('*'),
    ]);

    const me = mapProfile(meRes.data);
    // El email viene ya en profiles desde la migración 0002.
    const profiles = (profilesRes.data || []).map(mapProfile);
    const allMemberships = (membersRes.data || []).map(mapMembership);

    setUsers(profiles);
    setOrganizations((orgsRes.data || []).map(mapOrg));
    setMemberships(allMemberships);
    setColonies((coloniesRes.data || []).map(mapColony));
    setCats((catsRes.data || []).map(mapCat));
    setEvents((eventsRes.data || []).map(mapEvent));
    setShiftTemplates((templatesRes.data || []).map(mapShiftTemplate));
    setShifts((shiftsRes.data || []).map(mapShift));

    const ownOrgIds = allMemberships
      .filter(m => m.userId === userId)
      .map(m => m.orgId);
    return { me, ownOrgIds };
  };

  // Refresca los datos del usuario actualmente autenticado. Lo llamamos tras
  // mutaciones para que la UI refleje el nuevo estado.
  const refresh = async () => {
    const { data: { session: supaSession } } = await supabase.auth.getSession();
    if (!supaSession?.user) return;
    await loadAuthenticatedData(supaSession.user.id, supaSession.user.email);
  };

  // ───── Conexión a Supabase Auth ─────
  // Patrón en dos pasos:
  //   1) getSession() lee inmediatamente la sesión persistida (o null) — esto
  //      garantiza que setLoading(false) se llame aunque INITIAL_SESSION del
  //      listener tarde o no llegue (comportamiento observado en algunos
  //      flujos del cliente Supabase v2).
  //   2) onAuthStateChange escucha login/logout y refresh de token posteriores.
  // handleSession es idempotente, así que si ambos disparan está bien.
  useEffect(() => {
    let mounted = true;

    const handleSession = async (supaSession) => {
      if (!mounted) return;
      if (supaSession?.user) {
        const { me, ownOrgIds } = await loadAuthenticatedData(supaSession.user.id, supaSession.user.email);
        if (!mounted) return;

        // Resolver qué org abrir:
        //   1) La guardada si sigue siendo accesible.
        //   2) Si no, la primera de sus memberships (para usuarios normales).
        //   3) super_admin sin selección guardada → null y va a Plataforma.
        const savedOrgId = await load('selectedOrgId:' + supaSession.user.id);
        let resolvedOrgId = null;
        if (savedOrgId && ownOrgIds.includes(savedOrgId)) {
          resolvedOrgId = savedOrgId;
        } else if (!me?.superAdmin && ownOrgIds.length > 0) {
          resolvedOrgId = ownOrgIds[0];
        }

        setSession({ userId: supaSession.user.id, orgId: resolvedOrgId });
        setView(me?.superAdmin && !resolvedOrgId ? 'platform' : 'dashboard');
        const ack = await load('rgpdAck:' + supaSession.user.id);
        if (mounted) setRgpdAcknowledged(ack === true);
      } else {
        setSession(null);
        setUsers([]); setOrganizations([]); setMemberships([]); setColonies([]);
        setCats([]); setEvents([]); setShiftTemplates([]); setShifts([]);
      }
      if (mounted) setLoading(false);
    };

    // 1) Sesión inicial.
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    // 2) Cambios posteriores.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      handleSession(supaSession);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Helper para persistir la org seleccionada por usuario. Usamos clave por
  // userId para que si comparten dispositivo, cada uno conserve la suya.
  const persistSelectedOrg = async (orgId) => {
    if (!session?.userId) return;
    if (orgId) await save('selectedOrgId:' + session.userId, orgId);
    else await save('selectedOrgId:' + session.userId, null);
  };

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
  // El listener de onAuthStateChange se encarga de poblar la sesión y los datos
  // tras un signIn exitoso, así que aquí solo lanzamos la llamada y mapeamos
  // errores a mensajes legibles.
  const handleLogin = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (!error) return null;
    // Mensajes específicos solo cuando ayudan; en el resto, genérico para no
    // filtrar si el email existe o no.
    if (error.message?.toLowerCase().includes('email not confirmed')) {
      return 'Tu cuenta aún no está confirmada. Revisa tu correo.';
    }
    return 'Email o contraseña incorrectos.';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // El listener pone session=null y limpia arrays. Aquí solo reseteamos UI.
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
    // Crear org. Por RLS solo super_admin puede hacerlo; otros roles reciben
    // el rechazo del servidor. El flujo de "super_admin crea org y asigna
    // admin" es la vía estándar en producción (Plataforma).
    const { data: newOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name, city, contact_email: contactEmail, color: '#2D4A3E', suspended: false })
      .select()
      .single();
    if (orgErr) {
      await notify({
        title: 'No se pudo crear la organización',
        message: orgErr.code === '42501' || /row-level security/i.test(orgErr.message)
          ? 'Solo la administración de la plataforma puede crear nuevas organizaciones. Pídesela a un superadministrador.'
          : orgErr.message,
      });
      return;
    }
    // El usuario que la crea queda como admin de la org (solo si no es ya
    // super_admin "puro": super_admin no necesita membership para administrarla).
    if (!isSuperAdmin) {
      const { error: memErr } = await supabase.from('memberships').insert({
        user_id: session.userId, org_id: newOrg.id, role: 'admin',
      });
      if (memErr) {
        await notify({ title: 'Org creada, pero…', message: 'No se pudo asignar tu rol de admin: ' + memErr.message });
      }
    }
    await refresh();
    setSession({ ...session, orgId: newOrg.id });
    await persistSelectedOrg(newOrg.id);
    setView('dashboard'); setModal(null);
  };

  const handleSwitchOrg = async (orgId) => {
    setSession({ ...session, orgId });
    await persistSelectedOrg(orgId);
    setView('dashboard'); setSelectedCat(null); setSelectedColony(null);
  };

  // ───── Gestión de miembros ─────
  // Asignar a una persona ya registrada como miembro de la org actual con un
  // rol concreto. NOTA: en este punto NO creamos cuentas de usuario desde
  // aquí. El flujo es:
  //   1) La persona se registra (o el super_admin la crea desde el dashboard
  //      de Supabase), lo cual genera su entrada en auth.users + profiles.
  //   2) Un admin de org la asigna por email desde "Ajustes → Miembros".
  // El form acepta `name` y `password` por compatibilidad con la UI antigua,
  // pero los ignoramos: el nombre y contraseña los gestiona la propia persona.
  // Cuando construyamos el flujo de invitación con magic-link, se simplificará.
  const handleAddMember = async ({ email, role }) => {
    if (currentRole !== 'admin') return { error: 'No tienes permisos para añadir miembros.' };
    const normEmail = normalizeEmail(email);
    if (!normEmail || !isValidEmail(normEmail)) return { error: 'Email no válido.' };

    // Lookup del profile por email (case-insensitive).
    const { data: target, error: lookupErr } = await supabase
      .from('profiles')
      .select('id, name, email')
      .ilike('email', normEmail)
      .maybeSingle();
    if (lookupErr) return { error: 'Error buscando el usuario: ' + lookupErr.message };
    if (!target) {
      return { error: 'No existe ninguna cuenta con ese email. La persona debe registrarse primero, o pídele a un superadministrador que le cree la cuenta.' };
    }

    // Comprobar que no es ya miembro.
    const { data: existing } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', target.id)
      .eq('org_id', session.orgId)
      .maybeSingle();
    if (existing) return { error: `${target.name} ya es miembro de esta organización.` };

    // Crear membership.
    const { error: insErr } = await supabase.from('memberships').insert({
      user_id: target.id, org_id: session.orgId, role,
    });
    if (insErr) return { error: 'No se pudo asignar: ' + insErr.message };

    await refresh();
    return { ok: true };
  };

  const handleChangeMyPassword = async ({ current, next }) => {
    const me = users.find(u => u.id === session?.userId);
    if (!me?.email) return { error: 'No hay sesión activa.' };

    // Supabase Auth no expone una API directa de "cambiar contraseña con
    // verificación de la actual". Lo emulamos: re-autenticamos con la
    // contraseña actual (signInWithPassword) y, si pasa, cambiamos a la nueva.
    // Esto refresca el access token, lo cual es seguro y deseable.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: me.email,
      password: current,
    });
    if (signInErr) {
      return { error: 'La contraseña actual no es correcta.' };
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    if (updateErr) {
      return { error: 'No se pudo cambiar la contraseña: ' + updateErr.message };
    }

    setModal(null);
    return { ok: true };
  };

  // Reset de contraseña de OTRA persona. Supabase no permite hacerlo desde
  // cliente con la publishable key (necesita service_role o un magic-link
  // de recuperación por email). Hasta que montemos el flujo de magic-link
  // (Edge Function + SMTP), guiamos al usuario a hacerlo desde el panel
  // de Supabase. Se conserva la firma para que la UI siga funcionando sin
  // cambios; cuando llegue el flujo real solo cambia el body.
  const handleResetPassword = async (targetUserId) => {
    const target = users.find(u => u.id === targetUserId);
    if (!target) return { error: 'Usuario no encontrado.' };
    if (target.id === session?.userId) return { error: 'Usa "Cambiar contraseña" para tu propia cuenta.' };
    return {
      error: 'Resetear la contraseña de otra persona aún no está disponible desde la app. Pídele que use el botón "He olvidado mi contraseña" en la pantalla de login (próximamente), o contacta con la administración de la plataforma para hacerlo manualmente.',
    };
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
    const { error } = await supabase.from('memberships')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', session.orgId);
    if (error) {
      await notify({ title: 'No se pudo expulsar', message: error.message });
      return;
    }
    await refresh();
  };

  const handleChangeRole = async (userId, role) => {
    const { error } = await supabase.from('memberships')
      .update({ role })
      .eq('user_id', userId)
      .eq('org_id', session.orgId);
    if (error) {
      await notify({ title: 'No se pudo cambiar el rol', message: error.message });
      return;
    }
    await refresh();
  };

  const handleEditOrg = async (data) => {
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.city !== undefined) patch.city = data.city;
    if (data.contactEmail !== undefined) patch.contact_email = data.contactEmail;
    if (data.color !== undefined) patch.color = data.color;
    const { error } = await supabase.from('organizations').update(patch).eq('id', session.orgId);
    if (error) {
      await notify({ title: 'No se pudo guardar', message: error.message });
      return;
    }
    await refresh();
    setModal(null);
  };

  const handleLeaveOrg = async () => {
    const ok = await confirmAsync({
      title: 'Salir de la organización',
      message: 'Dejarás de tener acceso a las colonias, gatos y turnos de esta organización. La administración tendrá que volver a invitarte si quieres entrar de nuevo.',
      confirmLabel: 'Sí, salir',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('memberships')
      .delete()
      .eq('user_id', session.userId)
      .eq('org_id', session.orgId);
    if (error) {
      await notify({ title: 'No se pudo salir', message: error.message });
      return;
    }
    await refresh();
    // Si el usuario tiene otras orgs, ir a la primera; si no, logout.
    // Releemos memberships frescos (refresh ya los puso en state, pero el closure
    // tiene el array viejo). Fetcheamos directamente del cliente para decidir.
    const { data: mems } = await supabase.from('memberships')
      .select('org_id')
      .eq('user_id', session.userId)
      .limit(1);
    if (mems && mems.length > 0) await handleSwitchOrg(mems[0].org_id);
    else await handleLogout();
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
    // El cascade borra memberships y colonias asociadas.
    const { error } = await supabase.from('organizations').delete().eq('id', orgId);
    if (error) {
      await notify({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    await refresh();
    // Decidir destino: otra org del usuario, o logout.
    const { data: mems } = await supabase.from('memberships')
      .select('org_id')
      .eq('user_id', session.userId)
      .limit(1);
    if (mems && mems.length > 0) await handleSwitchOrg(mems[0].org_id);
    else if (isSuperAdmin) {
      setSession({ ...session, orgId: null });
      await persistSelectedOrg(null);
      setView('platform');
    } else {
      await handleLogout();
    }
  };

  // ───── Gestión de plataforma (superadmin) ─────
  const handlePlatformCreateOrg = async ({ name, city, contactEmail }) => {
    const { error } = await supabase.from('organizations').insert({
      name, city, contact_email: contactEmail, color: '#2D4A3E', suspended: false,
    });
    if (error) {
      await notify({ title: 'No se pudo crear la organización', message: error.message });
      return;
    }
    await refresh();
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
    // El cascade de la BD limpia memberships y colonies asociadas.
    const { error } = await supabase.from('organizations').delete().eq('id', orgId);
    if (error) {
      await notify({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    if (session.orgId === orgId) {
      setSession({ ...session, orgId: null });
      await persistSelectedOrg(null);
      setView('platform');
    }
    await refresh();
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
    const { error } = await supabase.from('organizations')
      .update({ suspended: newSuspended })
      .eq('id', orgId);
    if (error) {
      await notify({ title: 'No se pudo cambiar el estado', message: error.message });
      return;
    }
    await refresh();
  };

  const handlePlatformEditOrg = async (data) => {
    // data viene en camelCase del formulario; mapeamos a snake_case para la BD.
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.city !== undefined) patch.city = data.city;
    if (data.contactEmail !== undefined) patch.contact_email = data.contactEmail;
    if (data.color !== undefined) patch.color = data.color;
    const { error } = await supabase.from('organizations').update(patch).eq('id', data.id);
    if (error) {
      await notify({ title: 'No se pudo guardar', message: error.message });
      return;
    }
    await refresh();
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
    const { error } = await supabase.from('profiles')
      .update({ super_admin: !user.superAdmin })
      .eq('id', userId);
    if (error) {
      await notify({ title: 'No se pudo cambiar', message: error.message });
      return;
    }
    await refresh();
  };

  const handleExitToPlatform = async () => {
    setSession({ ...session, orgId: null });
    await persistSelectedOrg(null);
    setView('platform'); setSelectedCat(null); setSelectedColony(null);
  };

  const handleEnterOrgAsSuperAdmin = async (orgId) => {
    setSession({ ...session, orgId });
    await persistSelectedOrg(orgId);
    setView('dashboard'); setSelectedCat(null); setSelectedColony(null);
  };

  // ───── Datos (colonias, gatos, eventos) ─────
  // Guardas defensivas: en edición y borrado se verifica que el registro pertenece
  // a la org activa y se fuerza el orgId original para que un form manipulado no
  // pueda moverlo a otra organización. Útil cuando migremos a backend.
  const saveColony = async (form) => {
    if (!can(currentRole, form.id ? 'edit_colony' : 'add_colony')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }

    // Campos de la BD. lat/lng vienen como string de inputs; convertimos a
    // number o null. address/cuidadores/notes pueden venir vacíos: guardamos
    // null en lugar de '' para que las consultas y exports queden limpios.
    const toNumOrNull = (v) => (v === '' || v === undefined || v === null ? null : Number(v));
    const toTextOrNull = (v) => (v === '' || v === undefined || v === null ? null : v);
    const payload = {
      name: form.name,
      address: toTextOrNull(form.address),
      lat: toNumOrNull(form.lat),
      lng: toNumOrNull(form.lng),
      cuidadores: toTextOrNull(form.cuidadores),
      notes: toTextOrNull(form.notes),
    };

    if (form.id) {
      // Edición: comprobación local de que pertenece a la org activa. RLS
      // también lo bloquearía a nivel de BD; la doble guarda da mensaje claro.
      const existing = colonies.find(c => c.id === form.id);
      if (!existing || existing.orgId !== session.orgId) {
        await notify({ title: 'Operación no válida', message: 'Esta colonia no pertenece a la organización activa.' });
        return;
      }
      const { error } = await supabase.from('colonies').update(payload).eq('id', form.id);
      if (error) {
        await notify({ title: 'No se pudo guardar', message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('colonies').insert({
        ...payload,
        org_id: session.orgId,
      });
      if (error) {
        await notify({ title: 'No se pudo crear la colonia', message: error.message });
        return;
      }
    }

    await refresh();
    setModal(null);
  };

  const deleteColony = async () => {
    if (!selectedColony || !can(currentRole, 'delete_colony')) {
      await notify({ title: 'Sin permiso', message: 'Solo administración o coordinación pueden eliminar colonias.' });
      return;
    }
    const existing = colonies.find(c => c.id === selectedColony);
    if (!existing || existing.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Esta colonia no pertenece a la organización activa.' });
      return;
    }
    // El check de gatos vivos se mantiene; cuando migremos `cats` a Postgres
    // (fase 2) volverá a tener efecto. Ahora cats=[] siempre pasa el check.
    if (cats.some(c => c.colonyId === selectedColony)) {
      await notify({ title: 'Esta colonia tiene gatos', message: 'Antes de eliminar la colonia, mueve sus gatos a otra o elimínalos desde su ficha.' });
      return;
    }
    const ok = await confirmAsync({
      title: `Eliminar colonia "${existing.name}"`,
      message: 'La colonia desaparecerá del listado y del mapa. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('colonies').delete().eq('id', selectedColony);
    if (error) {
      await notify({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    await refresh();
    setSelectedColony(null);
    setView('colonies');
  };

  const saveCat = async (form) => {
    if (!can(currentRole, form.id ? 'edit_cat' : 'add_cat')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }

    const toTextOrNull = (v) => (v === '' || v === undefined || v === null ? null : v);
    const payload = {
      name: form.name,
      sex: form.sex || 'D',
      color: toTextOrNull(form.color),
      colony_id: toTextOrNull(form.colonyId),
      cer_status: form.cerStatus || 'pendiente',
      notes: toTextOrNull(form.notes),
      signs: toTextOrNull(form.signs),
      microchip: toTextOrNull(form.microchip),
      age: toTextOrNull(form.age),
    };

    if (form.id) {
      const existing = cats.find(c => c.id === form.id);
      if (!existing || existing.orgId !== session.orgId) {
        await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' });
        return;
      }
      const { error } = await supabase.from('cats').update(payload).eq('id', form.id);
      if (error) {
        await notify({ title: 'No se pudo guardar', message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('cats').insert({
        ...payload,
        org_id: session.orgId,
      });
      if (error) {
        await notify({ title: 'No se pudo crear el gato', message: error.message });
        return;
      }
    }

    await refresh();
    setModal(null);
  };

  const deleteCat = async () => {
    if (!selectedCat || !can(currentRole, 'delete_cat')) {
      await notify({ title: 'Sin permiso', message: 'Solo administración o coordinación pueden eliminar fichas de gato.' });
      return;
    }
    const existing = cats.find(c => c.id === selectedCat);
    if (!existing || existing.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' });
      return;
    }
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
    // El cascade en events.cat_id borra los eventos asociados automáticamente.
    const { error } = await supabase.from('cats').delete().eq('id', selectedCat);
    if (error) {
      await notify({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    await refresh();
    setSelectedCat(null);
    setView('cats');
  };

  const changeCatStatus = async (status) => {
    if (!can(currentRole, 'change_status')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const existing = cats.find(c => c.id === selectedCat);
    if (!existing || existing.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' });
      return;
    }
    const { error } = await supabase.from('cats').update({ cer_status: status }).eq('id', selectedCat);
    if (error) {
      await notify({ title: 'No se pudo cambiar el estado', message: error.message });
      return;
    }
    await refresh();
  };

  const saveEvent = async (form) => {
    if (!can(currentRole, 'add_event')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const cat = cats.find(c => c.id === selectedCat);
    if (!cat || cat.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Este gato no pertenece a la organización activa.' });
      return;
    }
    // form.date llega como ms (Date.now() en el form) o ISO string. Postgres
    // acepta ambos en una columna timestamptz, pero normalizamos a ISO para
    // evitar sorpresas con timezones.
    const dateIso = form.date
      ? new Date(form.date).toISOString()
      : new Date().toISOString();
    const payload = {
      cat_id: selectedCat,
      org_id: session.orgId,
      type: form.type,
      date: dateIso,
      vet: form.vet || null,
      cost: form.cost === '' || form.cost === undefined || form.cost === null ? null : Number(form.cost),
      notes: form.notes || null,
    };
    const { error } = await supabase.from('events').insert(payload);
    if (error) {
      await notify({ title: 'No se pudo registrar el evento', message: error.message });
      return;
    }
    await refresh();
    setModal(null);
  };

  // ───── Datos (calendario: plantillas y turnos) ─────
  const saveShiftTemplate = async (form) => {
    if (!can(currentRole, 'manage_shifts')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const payload = {
      colony_id: form.colonyId,
      days_of_week: form.daysOfWeek || [],
      slot: form.slot || slotFromTime(form.time),
      task: form.task,
      active: form.active !== false,
    };

    if (form.id) {
      const existing = shiftTemplates.find(t => t.id === form.id);
      if (!existing || existing.orgId !== session.orgId) {
        await notify({ title: 'Operación no válida', message: 'Esta plantilla no pertenece a la organización activa.' });
        return;
      }
      const { error } = await supabase.from('shift_templates').update(payload).eq('id', form.id);
      if (error) {
        await notify({ title: 'No se pudo guardar', message: error.message });
        return;
      }
    } else {
      const { error } = await supabase.from('shift_templates').insert({
        ...payload,
        org_id: session.orgId,
      });
      if (error) {
        await notify({ title: 'No se pudo crear la plantilla', message: error.message });
        return;
      }
    }

    await refresh();
    setModal(null); setSelectedTemplate(null);
  };

  const deleteShiftTemplate = async (templateId) => {
    if (!can(currentRole, 'manage_shifts')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const existing = shiftTemplates.find(t => t.id === templateId);
    if (!existing || existing.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Esta plantilla no pertenece a la organización activa.' });
      return;
    }
    const ok = await confirmAsync({
      title: 'Eliminar plantilla de turno',
      message: 'Los turnos ya asignados o completados se conservan como registro histórico, pero no se generarán nuevos a partir de esta plantilla.',
      confirmLabel: 'Eliminar plantilla',
      destructive: true,
    });
    if (!ok) return;
    // FK template_id → on delete set null: los turnos existentes se conservan
    // como histórico (sin templateId). Coherente con el mensaje de arriba.
    const { error } = await supabase.from('shift_templates').delete().eq('id', templateId);
    if (error) {
      await notify({ title: 'No se pudo eliminar', message: error.message });
      return;
    }
    await refresh();
    setModal(null); setSelectedTemplate(null);
  };

  // Materializa un turno virtual a real, o actualiza el existente. Devuelve
  // el turno persistido. Cuando es virtual, hacemos INSERT y leemos la fila
  // creada (con id real) para devolverla al llamador.
  const upsertShift = async (virtualOrReal, patch) => {
    if (virtualOrReal.orgId !== session.orgId) {
      await notify({ title: 'Operación no válida', message: 'Este turno no pertenece a la organización activa.' });
      return null;
    }

    // Construye el payload a partir del shift original + patch. Los nombres
    // que contienen ms (completedAt) se convierten a ISO para timestamptz.
    const buildPayload = (base, p) => {
      const merged = { ...base, ...p };
      const out = {
        slot: merged.slot || slotFromTime(merged.time),
        task: merged.task,
        assignee_id: merged.assigneeId ?? null,
        status: merged.status,
        notes: merged.notes ?? null,
        completed_at: merged.completedAt ? new Date(merged.completedAt).toISOString() : null,
        completed_by: merged.completedBy ?? null,
      };
      return out;
    };

    if (virtualOrReal._virtual) {
      // Virtual → INSERT. Hay que enviar también las claves estáticas
      // (org_id, colony_id, template_id, date) que en un UPDATE no tocaríamos.
      const insertPayload = {
        org_id: session.orgId,
        colony_id: virtualOrReal.colonyId,
        template_id: virtualOrReal.templateId,
        date: virtualOrReal.date, // 'YYYY-MM-DD'
        ...buildPayload(virtualOrReal, patch),
      };
      const { data, error } = await supabase.from('shifts').insert(insertPayload).select().single();
      if (error) {
        await notify({ title: 'No se pudo guardar el turno', message: error.message });
        return null;
      }
      const saved = mapShift(data);
      saved._template = virtualOrReal._template;
      saved._virtual = false;
      // Reflejar localmente sin esperar al refresh: el calendario reacciona al instante.
      setShifts(prev => [...prev, saved]);
      return saved;
    } else {
      // Real → UPDATE solo de los campos que pueden cambiar (no org_id, no
      // colony_id, no template_id, no date).
      const updatePayload = buildPayload(virtualOrReal, patch);
      const { data, error } = await supabase.from('shifts')
        .update(updatePayload)
        .eq('id', virtualOrReal.id)
        .select().single();
      if (error) {
        await notify({ title: 'No se pudo actualizar el turno', message: error.message });
        return null;
      }
      const saved = mapShift(data);
      saved._template = virtualOrReal._template;
      saved._virtual = false;
      setShifts(prev => prev.map(s => s.id === saved.id ? saved : s));
      return saved;
    }
  };

  const claimShift = async (shift) => {
    if (!can(currentRole, 'claim_shift')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const saved = await upsertShift(shift, { assigneeId: session.userId, status: 'assigned' });
    if (!saved) return;
    setSelectedShift(saved);
  };

  const unclaimShift = async (shift) => {
    const mine = shift.assigneeId === session.userId;
    if (!mine && !can(currentRole, 'assign_shift')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }

    // Caso especial: turno limpio (sin notas, no completado, vinculado a una
    // plantilla) → DELETE para devolverlo a estado virtual. La política de
    // RLS permite borrar al propio assignee, así que un voluntario que se
    // desapunta puede limpiar su rastro. Es importante hacer DELETE ANTES de
    // anular assignee_id, porque la política se evalúa contra la fila actual.
    const isClean = !shift._virtual && !shift.notes && shift.templateId && shift.status !== 'done';
    if (isClean) {
      const { error } = await supabase.from('shifts').delete().eq('id', shift.id);
      if (error) {
        await notify({ title: 'No se pudo desapuntar', message: error.message });
        return;
      }
      // Reflejo local + actualización de selectedShift a virtual.
      setShifts(prev => prev.filter(s => s.id !== shift.id));
      setSelectedShift({
        ...shift,
        id: `v:${shift.templateId}|${shift.date}|${shift.slot}`,
        _virtual: true, _template: shift._template,
        assigneeId: null, status: 'open', notes: '',
      });
      return;
    }

    // Caso normal: solo desasignar.
    const saved = await upsertShift(shift, { assigneeId: null, status: 'open' });
    if (!saved) return;
    setSelectedShift(saved);
  };

  const assignShiftTo = async (shift, userId) => {
    if (!can(currentRole, 'assign_shift')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
    const saved = await upsertShift(shift, { assigneeId: userId, status: 'assigned' });
    if (!saved) return;
    setSelectedShift(saved); setModal('viewShift');
  };

  const completeShift = async (shift) => {
    if (!can(currentRole, 'complete_shift')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
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
    if (!can(currentRole, 'complete_shift')) {
      await notify({ title: 'Sin permiso', message: 'Tu rol actual no permite esta acción. Habla con la administración de tu organización si crees que debería.', tone: 'warning' });
      return;
    }
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
