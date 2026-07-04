-- =============================================================================
-- 0010_cats_presence.sql
--
-- Añade el campo `presence` a `cats`: con qué frecuencia el gato aparece
-- por la colonia. Concepto INDEPENDIENTE del estado CER (cer_status).
--
--   habitual   — se ve a diario / con regularidad
--   esporadico — aparece de vez en cuando
--   no_viene   — hace tiempo que no se le ve
--
-- Es puramente informativo: no afecta a estadísticas ni a la lógica de
-- avisos. Los identificadores del enum van sin tildes ni ñ (igual que
-- cer_status: 'pendiente', 'esterilizado'…). Las etiquetas visibles se
-- traducen en el frontend vía i18n (presence.<valor>).
--
-- Default 'habitual': al añadir la columna, Postgres rellena todos los
-- gatos existentes con ese valor automáticamente.
-- =============================================================================

create type public.cat_presence as enum (
  'habitual',
  'esporadico',
  'no_viene'
);

alter table public.cats
  add column presence public.cat_presence not null default 'habitual';

comment on column public.cats.presence is
  'Frecuencia con la que el gato aparece por la colonia. Informativo, independiente de cer_status.';
