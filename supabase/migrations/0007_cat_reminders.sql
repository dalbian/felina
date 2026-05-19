-- =============================================================================
-- 0007_cat_reminders.sql
--
-- Tabla `cat_reminders` para gestionar pendientes médicos de cada gato
-- (próxima vacuna, desparasitación, dosis pendiente de un tratamiento…).
--
-- Conceptualmente distinto de `events`:
--   - events: registro histórico, lo que YA pasó.
--   - cat_reminders: lo que está PENDIENTE de hacer.
--
-- Cuando una voluntaria marque un recordatorio como hecho, opcionalmente
-- se podrá crear un evento veterinario asociado (UX en frontend). El
-- recordatorio queda con completed_at y completed_by para trazabilidad.
--
-- Permisos espejo de events:
--   - SELECT: cualquier miembro de la org.
--   - INSERT/UPDATE: admin, coordinator, volunteer, vet (cualquiera con
--     add_event puede gestionar recordatorios).
--   - DELETE: admin y coordinator.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA
-- -----------------------------------------------------------------------------
create table public.cat_reminders (
  id            uuid primary key default gen_random_uuid(),
  cat_id        uuid not null references public.cats(id) on delete cascade,
  -- org_id denormalizado (= cats.org_id) para que las RLS no necesiten join.
  -- Los gatos no se mueven de org, así que el denormalize es seguro.
  org_id        uuid not null references public.organizations(id) on delete cascade,
  type          public.event_type not null,
  due_date      date not null,
  title         text,
  notes         text,
  completed_at  timestamptz,
  completed_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index cat_reminders_cat_id_idx    on public.cat_reminders(cat_id);
create index cat_reminders_org_id_idx    on public.cat_reminders(org_id);
-- Útil para los widgets "vencidos" / "esta semana" del dashboard.
create index cat_reminders_due_date_idx  on public.cat_reminders(due_date)
  where completed_at is null;


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.cat_reminders enable row level security;

create policy "reminders_select_member_or_super"
  on public.cat_reminders for select
  using (public.is_super_admin() or public.is_org_member(org_id));

create policy "reminders_insert_member_with_perm"
  on public.cat_reminders for insert
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer', 'vet')
  );

create policy "reminders_update_member_with_perm"
  on public.cat_reminders for update
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer', 'vet')
  )
  with check (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator', 'volunteer', 'vet')
  );

create policy "reminders_delete_admin_or_coord"
  on public.cat_reminders for delete
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) in ('admin', 'coordinator')
  );
