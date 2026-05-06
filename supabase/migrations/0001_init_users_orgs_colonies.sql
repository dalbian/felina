-- =============================================================================
-- 0001_init_users_orgs_colonies.sql
--
-- Migración inicial. Crea las tablas base del modelo multi-tenant:
--   - organizations: las protectoras.
--   - profiles: 1-1 con auth.users (Supabase Auth gestiona email/contraseña).
--   - memberships: qué usuario pertenece a qué org y con qué rol.
--   - colonies: colonias de gatos, scoped por org.
--
-- Incluye Row Level Security (RLS) para garantizar que cada org solo ve sus
-- datos a nivel de base de datos, además del control en el frontend.
--
-- Las tablas de gatos, eventos y turnos llegan en la siguiente migración.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

-- Espejo de los roles definidos en src/lib/permissions.js.
create type public.org_role as enum ('admin', 'coordinator', 'volunteer', 'vet');


-- -----------------------------------------------------------------------------
-- TABLA: organizations
-- -----------------------------------------------------------------------------
create table public.organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  city           text,
  contact_email  text,
  color          text,
  suspended      boolean not null default false,
  created_at     timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- TABLA: profiles
-- 1-a-1 con auth.users. Aquí van los campos de aplicación (nombre, color,
-- super_admin). El email y la contraseña los gestiona Supabase Auth en
-- auth.users; nunca duplicarlos aquí.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  color        text,
  super_admin  boolean not null default false,
  created_at   timestamptz not null default now()
);


-- Trigger: cuando Supabase Auth crea un usuario en auth.users, insertamos
-- automáticamente su fila en profiles. Así no hay que recordar crearla
-- desde el frontend. El nombre se toma del raw_user_meta_data si viene; si
-- no, usa la parte local del email como fallback.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'color', '#8A6B1F')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- TABLA: memberships
-- -----------------------------------------------------------------------------
create table public.memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       public.org_role not null,
  joined_at  timestamptz not null default now(),
  unique (user_id, org_id)
);

create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_org_id_idx  on public.memberships(org_id);


-- -----------------------------------------------------------------------------
-- TABLA: colonies
-- -----------------------------------------------------------------------------
create table public.colonies (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  address      text,
  lat          double precision,
  lng          double precision,
  cuidadores   text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index colonies_org_id_idx on public.colonies(org_id);


-- =============================================================================
-- HELPER FUNCTIONS PARA RLS
--
-- Todas son security definer porque consultan memberships/profiles, y si
-- corrieran con RLS de la tabla consultada caerían en recursión. La seguridad
-- se mantiene porque solo se filtran por auth.uid() (el usuario autenticado).
-- =============================================================================

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


create function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.memberships
    where user_id = auth.uid()
      and org_id  = target_org_id
  );
$$;


create function public.user_org_role(target_org_id uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.memberships
  where user_id = auth.uid()
    and org_id  = target_org_id
  limit 1;
$$;


create function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_org_role(target_org_id) = 'admin';
$$;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.memberships   enable row level security;
alter table public.colonies      enable row level security;


-- ----- ORGANIZATIONS -----
-- Lectura: miembros de la org o super_admin.
-- Crear:   solo super_admin.
-- Editar:  admin de la org o super_admin.
-- Borrar:  solo super_admin.

create policy "orgs_select_member_or_super"
  on public.organizations for select
  using (public.is_super_admin() or public.is_org_member(id));

create policy "orgs_insert_super"
  on public.organizations for insert
  with check (public.is_super_admin());

create policy "orgs_update_admin_or_super"
  on public.organizations for update
  using       (public.is_super_admin() or public.is_org_admin(id))
  with check  (public.is_super_admin() or public.is_org_admin(id));

create policy "orgs_delete_super"
  on public.organizations for delete
  using (public.is_super_admin());


-- ----- PROFILES -----
-- Lectura: cualquier autenticado (necesario para mostrar nombres de miembros,
--          autores de eventos, etc.). Si en el futuro hace falta granularidad,
--          se restringe aquí.
-- Editar:  el propio usuario o super_admin.
-- Insert:  solo vía trigger handle_new_user (security definer, ignora RLS).

create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "profiles_update_self_or_super"
  on public.profiles for update
  using       (id = auth.uid() or public.is_super_admin())
  with check  (id = auth.uid() or public.is_super_admin());


-- Salvaguarda extra: el flag super_admin solo lo cambia un super_admin.
-- Sin esto, un usuario podría auto-promoverse vía UPDATE a su propio perfil
-- (la política le permite editar su fila, pero no debe poder tocar este campo).
--
-- Nota sobre el bootstrap: cuando auth.uid() es NULL estamos en un contexto
-- administrativo (SQL Editor del dashboard o service_role). En ese caso el
-- operador ya tiene permisos de admin del proyecto, y además es la única vía
-- para crear el primer super_admin (sin esto, el modelo es irrecuperable: no
-- habría manera de promover a nadie por primera vez). El bloqueo aplica solo
-- cuando hay un usuario autenticado que no es super_admin (auto-promoción).
create function public.guard_super_admin_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.super_admin is distinct from old.super_admin then
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only super admins can change super_admin flag';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_super_admin
  before update on public.profiles
  for each row execute function public.guard_super_admin_change();


-- ----- MEMBERSHIPS -----
-- Lectura: super_admin, el propio usuario, o cualquier miembro de la misma org
--          (para que admins vean a su equipo y voluntarios se vean entre sí).
-- Crear:   admin de la org o super_admin (las invitaciones las hace admin).
-- Editar:  admin de la org o super_admin (cambiar rol).
-- Borrar:  admin de la org, super_admin, o el propio usuario (abandonar org).

create policy "memberships_select_self_or_org_member_or_super"
  on public.memberships for select
  using (
    public.is_super_admin()
    or user_id = auth.uid()
    or public.is_org_member(org_id)
  );

create policy "memberships_insert_admin_or_super"
  on public.memberships for insert
  with check (public.is_super_admin() or public.is_org_admin(org_id));

create policy "memberships_update_admin_or_super"
  on public.memberships for update
  using      (public.is_super_admin() or public.is_org_admin(org_id))
  with check (public.is_super_admin() or public.is_org_admin(org_id));

create policy "memberships_delete_admin_super_or_self"
  on public.memberships for delete
  using (
    public.is_super_admin()
    or public.is_org_admin(org_id)
    or user_id = auth.uid()
  );


-- ----- COLONIES -----
-- Lectura: miembros de la org o super_admin.
-- Crear:   admin, coordinator o volunteer (espejo de permissions.js).
-- Editar:  admin o coordinator.
-- Borrar:  admin o coordinator (volunteer NO borra).

create policy "colonies_select_member_or_super"
  on public.colonies for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "colonies_insert_member_with_perm"
  on public.colonies for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  );

create policy "colonies_update_admin_or_coord"
  on public.colonies for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "colonies_delete_admin_or_coord"
  on public.colonies for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );
