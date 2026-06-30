-- =============================================================================
-- 0009_cats_birth_date.sql
--
-- Añade columna `birth_date` (DATE, nullable) a `cats` para registrar la
-- fecha aproximada de nacimiento del gato. La aplicación pide solo mes/año
-- y guarda siempre día 1 (ej. '2022-03-01').
--
-- Justificación: el campo `age` (text libre) que ya existía no se actualizaba
-- — un gato registrado como "4 años" seguía mostrando "4 años" años después.
-- Con birth_date la edad se calcula dinámicamente en el cliente.
--
-- Coexistencia con `age`: mantenemos la columna anterior. Los gatos ya
-- registrados conservan su `age` (texto libre) y se muestra como fallback
-- hasta que alguien edite la ficha y rellene birth_date. Cero pérdida.
-- =============================================================================

alter table public.cats
  add column birth_date date;

comment on column public.cats.birth_date is
  'Fecha aproximada de nacimiento (día 1 del mes, ej. 2022-03-01). NULL si desconocida.';
