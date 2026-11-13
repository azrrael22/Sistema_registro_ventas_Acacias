-- Documento de identidad de cada empleado (tipo + número).
-- Se pide al registrarse; los empleados que ya existían quedan sin documento
-- hasta que un administrador lo complete con actualizar_documento_empleado.

create type tipo_documento as enum ('TI', 'CC', 'Pasaporte');

alter table empleados
  add column tipo_documento   tipo_documento,
  add column numero_documento text,
  add constraint empleados_documento_completo
    check ((tipo_documento is null) = (numero_documento is null)),
  add constraint empleados_documento_formato
    check (case tipo_documento
             when 'Pasaporte' then numero_documento ~ '^[A-Z0-9]{5,20}$'
             else numero_documento ~ '^[0-9]{5,12}$'
           end);

create unique index empleados_documento_unico on empleados (tipo_documento, numero_documento);

-- Alta automática del perfil: ahora también guarda el documento enviado en el registro
create or replace function trg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  v_nombre := coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1));
  insert into empleados (id, nombre, email, tipo_documento, numero_documento)
  values (new.id, v_nombre, new.email,
          nullif(trim(new.raw_user_meta_data->>'tipo_documento'), '')::tipo_documento,
          nullif(trim(new.raw_user_meta_data->>'numero_documento'), ''));
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select e.id, 'registro_pendiente', 'Nuevo registro pendiente',
         v_nombre || ' (' || new.email || ') se registró y espera aprobación',
         jsonb_build_object('empleado_id', new.id)
  from empleados e
  where e.es_admin and e.activo;
  return new;
end $$;

-- Corregir o completar el documento de un empleado. Solo administradores.
create function actualizar_documento_empleado(p_id uuid, p_tipo tipo_documento, p_numero text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'Solo los administradores pueden hacer esto'; end if;
  update empleados set tipo_documento = p_tipo, numero_documento = p_numero where id = p_id;
  if not found then raise exception 'Empleado no encontrado'; end if;
end $$;

revoke all on function actualizar_documento_empleado(uuid, tipo_documento, text) from anon, public;
grant execute on function actualizar_documento_empleado(uuid, tipo_documento, text) to authenticated;
