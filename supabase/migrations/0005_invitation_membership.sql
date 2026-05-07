-- =============================================================================
-- 0005_invitation_membership.sql
--
-- Extiende handle_new_user para que, cuando un usuario se registre desde
-- una invitación, cree automáticamente la fila de memberships
-- correspondiente. Sin esto, el invitado entraría a la app y vería la
-- pantalla "no perteneces a ninguna organización" — exactamente lo que
-- queremos evitar con el flujo de invitaciones autónomas.
--
-- Mecánica: cuando el admin invita por email, llamamos a
-- auth.admin.inviteUserByEmail con metadata `invited_org_id` y
-- `invited_role`. Esa metadata viaja en raw_user_meta_data del usuario
-- recién creado en auth.users. El trigger lo lee aquí y crea la
-- membership.
--
-- El bloque exception captura errores de cast (metadata inválida) y de
-- inserción (FK rota, org borrada entre tanto, etc.). Si algo falla en la
-- creación de membership, el signup se completa igualmente — el usuario
-- queda como huérfano y un admin tendrá que asignarlo después. Mejor eso
-- que romper el signup entero.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invited_org_id uuid;
  invited_role public.org_role;
begin
  -- 1) Crear el profile del usuario (igual que antes).
  insert into public.profiles (id, name, email, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'color', '#8A6B1F')
  );

  -- 2) Si llega con metadata de invitación, crear también la membership.
  begin
    invited_org_id := nullif(new.raw_user_meta_data->>'invited_org_id', '')::uuid;
    invited_role := nullif(new.raw_user_meta_data->>'invited_role', '')::public.org_role;
    if invited_org_id is not null and invited_role is not null then
      insert into public.memberships (user_id, org_id, role)
      values (new.id, invited_org_id, invited_role)
      on conflict (user_id, org_id) do nothing;
    end if;
  exception when others then
    -- Metadata inválida o error en el insert: no rompemos el signup.
    -- El usuario queda sin membership y un admin podrá asignarlo después.
    null;
  end;

  return new;
end;
$$;
