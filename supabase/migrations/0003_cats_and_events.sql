-- =============================================================================
-- 0003_cats_and_events.sql
--
-- Tablas de gatos y eventos veterinarios. Espejo del modelo del prototipo:
--   - cats: ficha del gato (orgScoped, opcionalmente vinculado a una colonia).
--   - events: historial veterinario, vinculado a un gato.
--
-- Enums:
--   - cer_status: progresión del programa CER (Captura-Esterilización-Retorno).
--   - cat_sex: H/M/D (Hembra/Macho/Desconocido). Mantenemos los códigos
--     literales del prototipo para no tener que tocar componentes.
--   - event_type: tipos de evento veterinario.
--
-- Denormalización: eventos también guardan org_id (= cats.org_id) para que
-- las RLS no necesiten join. Es seguro porque los gatos no se mueven de org.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type public.cer_status as enum (
  'pendiente',
  'capturado',
  'esterilizado',
  'en_colonia',
  'en_acogida',
  'adoptado',
  'fallecido'
);

create type public.cat_sex as enum ('H', 'M', 'D');

create type public.event_type as enum (
  'esterilizacion',
  'vacunacion',
  'desparasitacion',
  'consulta',
  'tratamiento'
);


-- -----------------------------------------------------------------------------
-- TABLA: cats
-- -----------------------------------------------------------------------------
create table public.cats (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  -- colony_id puede ser null (gato en acogida sin colonia, fallecido, etc.).
  -- on delete set null: si se borra la colonia, el gato queda sin colonia
  -- en lugar de borrarse también.
  colony_id   uuid references public.colonies(id) on delete set null,
  name        text not null,
  sex         public.cat_sex not null default 'D',
  color       text,
  cer_status  public.cer_status not null default 'pendiente',
  notes       text,
  signs       text,
  microchip   text,
  age         text,
  created_at  timestamptz not null default now()
);

create index cats_org_id_idx    on public.cats(org_id);
create index cats_colony_id_idx on public.cats(colony_id);


-- -----------------------------------------------------------------------------
-- TABLA: events (historial veterinario)
-- -----------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  cat_id      uuid not null references public.cats(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  type        public.event_type not null,
  date        timestamptz not null,
  vet         text,
  cost        numeric(10, 2),
  notes       text,
  created_at  timestamptz not null default now()
);

create index events_cat_id_idx on public.events(cat_id);
create index events_org_id_idx on public.events(org_id);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.cats   enable row level security;
alter table public.events enable row level security;


-- ----- CATS -----
-- Espejo de COORDINATOR_ACTIONS y VOLUNTEER_ACTIONS de src/lib/permissions.js:
--   - Lectura: miembros de la org o super_admin.
--   - Crear/editar/cambiar estado: admin, coordinator, volunteer.
--   - Borrar: admin, coordinator (volunteer NO).

create policy "cats_select_member_or_super"
  on public.cats for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "cats_insert_member_with_perm"
  on public.cats for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  );

create policy "cats_update_member_with_perm"
  on public.cats for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  );

create policy "cats_delete_admin_or_coord"
  on public.cats for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );


-- ----- EVENTS -----
--   - Lectura: miembros de la org o super_admin.
--   - Crear: admin, coordinator, volunteer, vet (todos los roles activos).
--   - Editar/borrar: admin o coordinator (los registros veterinarios son
--     histórico; voluntarios y veterinarios añaden, no rectifican).

create policy "events_select_member_or_super"
  on public.events for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "events_insert_member_with_perm"
  on public.events for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer', 'vet')
  );

create policy "events_update_admin_or_coord"
  on public.events for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "events_delete_admin_or_coord"
  on public.events for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );
