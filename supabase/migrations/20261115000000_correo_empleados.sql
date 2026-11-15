-- Los empleados pueden cambiar su correo desde "Mi perfil" (supabase.auth.updateUser).
-- Supabase solo cambia auth.users.email cuando se confirma el cambio; este trigger
-- copia el correo nuevo a empleados, que es a donde llegan las notificaciones.

create function trg_correo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update empleados set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function trg_correo_usuario();
