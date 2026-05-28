-- =============================================================================
-- 0008_activity_log.sql
--
-- Registro de actividad de la organización: quién hizo qué y cuándo.
-- Visible solo para admins de la org y super_admins (RLS).
-- Retención automática de 90 días por motivos RGPD (purga vía trigger
-- probabilístico para no necesitar pg_cron, que no está en plan Free).
--
-- Decisiones de diseño:
--   - user_id es soft FK (ON DELETE SET NULL) + snapshot user_name: si el
--     perfil se borra, el log sobrevive con el nombre que tenía cuando
--     ocurrió la acción.
--   - entity_id NO tiene constraint (soft FK): un evento "se borró el gato X"
--     debe persistir aunque la fila del gato ya no exista.
--   - action: clave estable en inglés (cat_added, cat_status_changed…) que
--     el frontend traduce vía i18n. Permite cambiar textos sin migración.
--   - metadata jsonb: detalles opcionales por acción (colonia destino, estado
--     CER anterior y nuevo, rol asignado, importe del evento, etc.).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLA
-- -----------------------------------------------------------------------------
create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  -- Si se borra el perfil, el log conserva el nombre snapshot (user_name).
  user_id      uuid references public.profiles(id) on delete set null,
  user_name    text not null,
  action       text not null,
  entity_type  text,
  -- Soft FK: el gato/colonia/etc. puede haberse borrado y el log debe
  -- mantenerse legible ("borró el gato Felix de la colonia Plaça del Pi").
  entity_id    uuid,
  entity_name  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- Índice compuesto: la query estándar es "últimas N entradas de la org
-- ordenadas por fecha desc". El índice cubre WHERE org_id + ORDER BY created_at.
create index activity_log_org_created_idx
  on public.activity_log(org_id, created_at desc);

-- Índice secundario para filtros por usuario dentro de una org.
create index activity_log_org_user_idx
  on public.activity_log(org_id, user_id)
  where user_id is not null;


-- -----------------------------------------------------------------------------
-- PURGA AUTOMÁTICA >90 DÍAS
--
-- Trigger probabilístico: cada INSERT tiene un 1% de probabilidad de disparar
-- un DELETE de entradas viejas para esa org. Equivale a ~1 limpieza cada 100
-- acciones, que es ampliamente suficiente para mantener la tabla limpia sin
-- necesitar pg_cron (no disponible en plan Free) ni Edge Function programada.
--
-- security definer + el delete acotado a la propia org del nuevo registro
-- evitan escaladas: el trigger NO puede borrar logs de otras orgs.
-- -----------------------------------------------------------------------------
create or replace function public.purge_old_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if random() < 0.01 then
    delete from public.activity_log
    where org_id = new.org_id
      and created_at < now() - interval '90 days';
  end if;
  return new;
end;
$$;

create trigger activity_log_purge_after_insert
after insert on public.activity_log
for each row execute function public.purge_old_activity();


-- =============================================================================
-- ROW LEVEL SECURITY
--
-- Lectura: solo admins de la org o super_admin (datos sensibles de quién
--   hizo qué). Coordinadores, voluntarios y vets NO ven el log.
-- Escritura: cualquier miembro de la org puede insertar SU propia acción
--   (la app escribe el log desde los handlers tras cada mutación).
--   El check fuerza user_id = auth.uid() para evitar falsificaciones.
-- Update/delete: NADIE (registros inmutables; la purga va por el trigger
--   con security definer).
-- =============================================================================
alter table public.activity_log enable row level security;

create policy "activity_select_admin_or_super"
  on public.activity_log for select
  using (
    public.is_super_admin()
    or public.user_org_role(org_id) = 'admin'
  );

create policy "activity_insert_self_member"
  on public.activity_log for insert
  with check (
    public.is_org_member(org_id)
    and user_id = auth.uid()
  );
