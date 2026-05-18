-- =============================================================================
-- 0006_cat_photos.sql
--
-- Soporte para fotos de gatos. Añade columna `photo_url` a `cats` y crea
-- un bucket de Storage `cat-photos` con sus políticas RLS.
--
-- Diseño:
--   - Bucket público para lectura (cat photos no son datos sensibles y
--     servirlas con <img src> directo es más simple que firmar URLs).
--   - Escrituras (insert/update/delete) restringidas a miembros de la org
--     dueña de la foto, verificado por el prefijo de la ruta.
--   - Ruta del archivo: `{org_id}/{cat_id}.jpg`. El primer segmento de la
--     ruta lo extraemos con storage.foldername() y comparamos contra los
--     memberships del usuario. Si la ruta no es un uuid válido, el cast
--     falla y la policy bloquea (comportamiento correcto).
--
-- Notas:
--   - Si en el futuro se quiere granularidad por rol (volunteer puede
--     subir pero no borrar, etc.), se separan policies por operación con
--     condiciones más finas. Hoy la matriz de permisos lo decide en el
--     frontend antes de llamar a Storage; las policies son la red de
--     seguridad de "miembro de la org".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Columna nueva en cats
-- -----------------------------------------------------------------------------
alter table public.cats add column photo_url text;


-- -----------------------------------------------------------------------------
-- Bucket de Storage
-- -----------------------------------------------------------------------------
-- "public" significa que cualquiera con la URL puede leer el objeto
-- (sin token, sin sesión). Las paths son uuid-based, no enumerables.
insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- Políticas RLS de Storage
-- -----------------------------------------------------------------------------
-- Lectura: pública, sin restricción. Lo que protege es la imposibilidad
-- de enumerar paths (todos son uuids).
create policy "cat_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'cat-photos');

-- Insert: usuario autenticado que sea miembro (o super_admin) de la org
-- cuyo uuid es el primer segmento de la ruta.
create policy "cat_photos_insert_org_member"
  on storage.objects for insert
  with check (
    bucket_id = 'cat-photos'
    and (
      public.is_super_admin()
      or public.is_org_member(((storage.foldername(name))[1])::uuid)
    )
  );

-- Update: mismo criterio. Cubre el caso `upsert: true` cuando se reemplaza
-- la foto existente de un gato.
create policy "cat_photos_update_org_member"
  on storage.objects for update
  using (
    bucket_id = 'cat-photos'
    and (
      public.is_super_admin()
      or public.is_org_member(((storage.foldername(name))[1])::uuid)
    )
  )
  with check (
    bucket_id = 'cat-photos'
    and (
      public.is_super_admin()
      or public.is_org_member(((storage.foldername(name))[1])::uuid)
    )
  );

-- Delete: mismo criterio. Para borrar foto al quitarla del gato o al
-- eliminar la ficha del gato.
create policy "cat_photos_delete_org_member"
  on storage.objects for delete
  using (
    bucket_id = 'cat-photos'
    and (
      public.is_super_admin()
      or public.is_org_member(((storage.foldername(name))[1])::uuid)
    )
  );
