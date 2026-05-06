-- =============================================================================
-- 0004_shifts.sql
--
-- Tablas de turnos: plantillas recurrentes y sus instancias materializadas.
--
-- Modelo:
--   - shift_templates: plantillas activas (colonia + días de la semana +
--     franja + tarea). Generan turnos "virtuales" en el calendario que NO
--     existen como filas hasta que alguien interactúa con ellos.
--   - shifts: instancias reales. Se crean cuando una voluntaria se apunta,
--     un coordinador asigna, alguien completa, o se añade una nota. Pueden
--     ser ad-hoc (sin templateId) si se crean fuera de cualquier plantilla.
--
-- Diseño FK:
--   - template_id ON DELETE SET NULL: al borrar una plantilla, los turnos
--     ya creados se conservan como histórico (mensaje del UI lo promete) y
--     pierden el vínculo con la plantilla.
--   - colony_id ON DELETE CASCADE en ambas: si se borra la colonia, todo
--     su plan de cuidados desaparece con ella.
--
-- Lógica que la BD soporta:
--   - Voluntarias pueden borrar SU turno (cuando hacen "unclaim" de un turno
--     limpio, devolviéndolo a virtual). Por eso DELETE incluye el caso
--     `assignee_id = auth.uid()`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type public.shift_slot as enum ('morning', 'afternoon');

create type public.shift_task as enum (
  'alimentacion',
  'agua_limpieza',
  'observacion',
  'medicacion',
  'otros'
);

create type public.shift_status as enum ('open', 'assigned', 'done');


-- -----------------------------------------------------------------------------
-- TABLA: shift_templates
-- -----------------------------------------------------------------------------
create table public.shift_templates (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  colony_id     uuid not null references public.colonies(id) on delete cascade,
  -- 0 = domingo, 1 = lunes … 6 = sábado. Una plantilla puede dispararse
  -- en varios días, p.ej. {1, 3, 5} para lunes/miércoles/viernes.
  -- El check usa el operador `<@` ("está contenido por"): todos los valores
  -- del array deben pertenecer al conjunto 0..6. Postgres no acepta subqueries
  -- en CHECK constraints, pero los operadores de array son válidos.
  days_of_week  smallint[] not null check (
    array_length(days_of_week, 1) > 0
    and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  slot          public.shift_slot not null,
  task          public.shift_task not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index shift_templates_org_id_idx    on public.shift_templates(org_id);
create index shift_templates_colony_id_idx on public.shift_templates(colony_id);


-- -----------------------------------------------------------------------------
-- TABLA: shifts
-- -----------------------------------------------------------------------------
create table public.shifts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  colony_id     uuid not null references public.colonies(id) on delete cascade,
  template_id   uuid references public.shift_templates(id) on delete set null,
  -- date PURO (sin hora). El día decide; la franja la lleva `slot`.
  date          date not null,
  slot          public.shift_slot not null,
  task          public.shift_task not null,
  assignee_id   uuid references auth.users(id) on delete set null,
  status        public.shift_status not null default 'open',
  notes         text,
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index shifts_org_id_idx       on public.shifts(org_id);
create index shifts_colony_id_idx    on public.shifts(colony_id);
create index shifts_template_id_idx  on public.shifts(template_id);
create index shifts_date_idx         on public.shifts(date);
create index shifts_assignee_id_idx  on public.shifts(assignee_id);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.shift_templates enable row level security;
alter table public.shifts          enable row level security;


-- ----- SHIFT_TEMPLATES -----
-- Espejo de `manage_shifts` en src/lib/permissions.js: solo admin y
-- coordinator gestionan plantillas. Voluntarias y veterinarios solo leen.

create policy "tpl_select_member_or_super"
  on public.shift_templates for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "tpl_insert_admin_or_coord"
  on public.shift_templates for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "tpl_update_admin_or_coord"
  on public.shift_templates for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "tpl_delete_admin_or_coord"
  on public.shift_templates for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );


-- ----- SHIFTS -----
-- Voluntarias necesitan INSERT/UPDATE para apuntarse y completar turnos.
-- Solo admin/coord/super pueden borrar arbitrariamente, pero también la
-- propia voluntaria puede borrar SU turno (caso "unclaim de turno limpio").

create policy "shifts_select_member_or_super"
  on public.shifts for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "shifts_insert_member_with_perm"
  on public.shifts for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  );

create policy "shifts_update_member_with_perm"
  on public.shifts for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer')
  );

create policy "shifts_delete_admin_coord_or_self"
  on public.shifts for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
    or assignee_id = auth.uid()
  );
