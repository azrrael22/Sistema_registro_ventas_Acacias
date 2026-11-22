-- Nombre de cada empleado en partes: primer nombre y los dos apellidos son obligatorios,
-- el segundo nombre es opcional.
-- `nombre` pasa a ser una columna generada (primer nombre + primer apellido): es el que se
-- ve en la app, las notificaciones y los correos, así que lo que ya lo leía sigue igual.
-- `nombre_completo` (las cuatro partes) se muestra en Empleados y en Mi perfil.
-- Los empleados que ya existían se separan por palabras; a los que les falten apellidos
-- los completan desde Mi perfil.

alter table empleados
  add column primer_nombre    text,
  add column segundo_nombre   text,
  add column primer_apellido  text,
  add column segundo_apellido text;

-- 1 palabra = nombre; 2 = nombre + apellido; 3 = nombre + dos apellidos;
-- 4 o más = primer nombre, segundo nombre (las del medio) y las dos últimas como apellidos.
update empleados e set
  primer_nombre    = coalesce(nullif(s.p[1], ''), split_part(e.email, '@', 1)),
  segundo_nombre   = case when s.n >= 4 then array_to_string(s.p[2:s.n - 2], ' ') end,
  primer_apellido  = case when s.n in (2, 3) then s.p[2] when s.n >= 4 then s.p[s.n - 1] end,
  segundo_apellido = case when s.n = 3 then s.p[3] when s.n >= 4 then s.p[s.n] end
from (select id, p, cardinality(p) as n
      from empleados, regexp_split_to_array(trim(nombre), '\s+') as p) s
where s.id = e.id;

alter table empleados alter column primer_nombre set not null;
alter table empleados drop column nombre;  -- también quita el grant update (nombre)

-- concat_ws no es immutable y no sirve en una columna generada
alter table empleados
  add column nombre text not null generated always as (
    primer_nombre || coalesce(' ' || primer_apellido, '')) stored,
  add column nombre_completo text not null generated always as (
    primer_nombre || coalesce(' ' || segundo_nombre, '')
      || coalesce(' ' || primer_apellido, '') || coalesce(' ' || segundo_apellido, '')) stored,
  -- Sin espacios al inicio ni al final, entre 1 y 40 caracteres
  add constraint empleados_primer_nombre_formato    check (primer_nombre    ~ '^\S(.{0,38}\S)?$'),
  add constraint empleados_segundo_nombre_formato   check (segundo_nombre   ~ '^\S(.{0,38}\S)?$'),
  add constraint empleados_primer_apellido_formato  check (primer_apellido  ~ '^\S(.{0,38}\S)?$'),
  add constraint empleados_segundo_apellido_formato check (segundo_apellido ~ '^\S(.{0,38}\S)?$');

-- Los apellidos son obligatorios al crear el perfil y no se pueden borrar. Solo se revisa
-- cuando se escriben, para que los empleados antiguos sin apellidos se puedan seguir
-- aprobando o desactivando y su correo se siga sincronizando.
create function trg_apellidos_empleado() returns trigger
language plpgsql as $$
begin
  raise exception 'El primer y el segundo apellido son obligatorios';
end $$;

create trigger empleados_apellidos before insert or update of primer_apellido, segundo_apellido on empleados
  for each row when (new.primer_apellido is null or new.segundo_apellido is null)
  execute function trg_apellidos_empleado();

-- Alta automática del perfil: ahora con el nombre en partes y sin usar el correo como nombre
create or replace function trg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  insert into empleados (id, email, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                         tipo_documento, numero_documento)
  values (new.id, new.email,
          nullif(trim(new.raw_user_meta_data->>'primer_nombre'), ''),
          nullif(trim(new.raw_user_meta_data->>'segundo_nombre'), ''),
          nullif(trim(new.raw_user_meta_data->>'primer_apellido'), ''),
          nullif(trim(new.raw_user_meta_data->>'segundo_apellido'), ''),
          nullif(trim(new.raw_user_meta_data->>'tipo_documento'), '')::tipo_documento,
          nullif(trim(new.raw_user_meta_data->>'numero_documento'), ''))
  returning nombre_completo into v_nombre;
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select e.id, 'registro_pendiente', 'Nuevo registro pendiente',
         v_nombre || ' (' || new.email || ') se registró y espera aprobación',
         jsonb_build_object('empleado_id', new.id)
  from empleados e
  where e.es_admin and e.activo;
  return new;
end $$;

revoke all on function trg_apellidos_empleado() from anon, public;

-- Cada empleado cambia su propio nombre desde Mi perfil (emp_update limita a la fila propia)
grant update (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) on empleados to authenticated;
