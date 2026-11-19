-- =============================================================================
-- 0011 — Cancelar el turno de un día concreto
-- =============================================================================
-- Problema que resuelve: una plantilla genera turnos todos los días que le
-- tocan, y hasta ahora o se conservaba entera o se borraba entera. Si un día
-- suelto al final no se hace (fiesta, obras, cambio de planes), no había forma
-- de quitarlo del calendario sin cargarse la plantilla.
--
-- Decisión de diseño: NO tocamos el enum `shift_status`. `status` describe el
-- ciclo de vida de la cobertura (open → assigned → done) y la cancelación es
-- otra dimensión: un turno cancelado puede tener asignada a alguien y así
-- conservamos ese rastro. Además, añadir valores a un enum en Postgres tiene
-- restricciones de transacción que no merece la pena arrastrar.
--
-- Un turno cancelado se materializa como fila real aunque viniera de una
-- plantilla (es la única manera de recordar la excepción). Al reactivarlo, si
-- la fila no guarda nada más (sin notas, sin asignar, sin completar) se borra
-- y el turno vuelve a ser virtual, igual que hace `unclaimShift`.

alter table public.shifts
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

comment on column public.shifts.cancelled_at is
  'Si no es null, ese día no se hace el turno. La plantilla sigue intacta.';

-- Índice parcial: las consultas del calendario piden rangos de fechas y luego
-- filtran cancelados. Son pocos por definición, así que solo indexamos esos.
create index if not exists shifts_cancelled_idx
  on public.shifts(org_id, date)
  where cancelled_at is not null;

-- RLS: no hacen falta políticas nuevas. Cancelar es un UPDATE (o un INSERT
-- cuando el turno era virtual) sobre `shifts`, y las políticas de la 0004 ya
-- cubren a admin/coordinator. Que solo ellos puedan cancelar se comprueba en
-- la app con el permiso `manage_shifts`, igual que el resto de gestión de
-- turnos.
