-- =============================================================================
-- 0012 — Notas del calendario (una por día y protectora)
-- =============================================================================
-- Para avisos sueltos que no son un turno: "viene la veterinaria", "cerrado
-- por obras", "reparto de pienso". Hasta ahora no había dónde escribirlos y la
-- gente acababa usando las notas de un turno cualquiera.
--
-- Decisión de producto: UNA nota por día y organización, que se va editando.
-- Más simple de leer de un vistazo en la cuadrícula del mes; el precio es que
-- dos personas editando el mismo día pueden pisarse. Con equipos de este
-- tamaño es asumible.
--
-- Permisos: espejo de `manage_shifts` en src/lib/permissions.js. Escriben
-- admin y coordinator; el resto de la organización solo lee.

create table if not exists public.calendar_notes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  -- date PURO, sin hora: la nota es del día entero.
  date        date not null,
  -- Longitud acotada: es un aviso corto, no un diario. El formulario avisa
  -- antes de llegar aquí; el check es la red de seguridad.
  text        text not null check (length(trim(text)) between 1 and 500),
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Una sola nota por día y organización: es lo que hace que "editar la nota
  -- del jueves" sea una operación sin ambigüedad (upsert sobre esta clave).
  unique (org_id, date)
);

create index if not exists calendar_notes_org_date_idx
  on public.calendar_notes(org_id, date);

alter table public.calendar_notes enable row level security;

create policy "notes_select_member_or_super"
  on public.calendar_notes for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "notes_insert_admin_or_coord"
  on public.calendar_notes for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "notes_update_admin_or_coord"
  on public.calendar_notes for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );

create policy "notes_delete_admin_or_coord"
  on public.calendar_notes for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );
