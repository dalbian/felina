-- =============================================================================
-- 0002_profiles_email.sql
--
-- Añade `email` a profiles. El email es la propiedad canónica de la
-- identidad en auth.users; se denormaliza aquí para permitir búsquedas
-- por email desde el frontend (asignar miembros, lookups, listados) sin
-- necesidad de exponer auth.users a la API pública.
--
-- Mantenemos el invariante 1-a-1 entre auth.users y profiles: el trigger
-- handle_new_user lo poblará en cada signup, y un índice único garantiza
-- que no aparezcan duplicados (case-insensitive).
-- =============================================================================

-- 1) Añadir columna como nullable para poder hacer el backfill.
alter table public.profiles add column email text;

-- 2) Backfill desde auth.users.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

-- 3) Marcar NOT NULL una vez todos los registros tienen valor.
alter table public.profiles alter column email set not null;

-- 4) Índice único case-insensitive para evitar duplicados accidentales.
create unique index profiles_email_lower_idx on public.profiles (lower(email));

-- 5) Recrear el trigger handle_new_user para que también pueble email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'color', '#8A6B1F')
  );
  return new;
end;
$$;
