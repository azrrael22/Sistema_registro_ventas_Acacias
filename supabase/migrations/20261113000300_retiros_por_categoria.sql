-- Los retiros pasan a ser por categoría: el socio retira del saldo de toda la sociedad
-- (ventas netas de todos los productos de la categoría - retiros de la categoría),
-- no del saldo de un producto suelto.

-- ---------- retiros.categoria_id ----------
-- Los retiros que ya existían quedan en la categoría de su producto.
alter table retiros add column categoria_id bigint references categorias(id);
update retiros r set categoria_id = p.categoria_id from productos p where p.id = r.producto_id;
alter table retiros alter column categoria_id set not null;
create index on retiros(categoria_id);

-- Lo que dependía de producto_id se recrea abajo por categoría
drop policy ret_insert on retiros;
drop policy ret_read on retiros;
drop view saldo_producto;
alter table retiros drop column producto_id;

-- ¿Es el empleado socio activo de esta categoría?
create function es_socio_categoria(p_empleado uuid, p_categoria bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from socios
    where empleado_id = p_empleado and categoria_id = p_categoria and activo
  );
$$;

-- Saldo disponible por categoría = ventas netas de sus productos - retiros
create view saldo_categoria with (security_invoker = true) as
select c.id as categoria_id, c.nombre,
       coalesce((select sum(m.monto_neto) from movimientos_producto m
                 join productos p on p.id = m.producto_id
                 where p.categoria_id = c.id), 0)
     - coalesce((select sum(monto) from retiros r where r.categoria_id = c.id), 0) as saldo
from categorias c;

-- Validar retiro + notificar a los demás socios de la categoría
create or replace function trg_retiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_cat text; v_quien text; v_saldo numeric;
begin
  if not es_socio_categoria(new.empleado_id, new.categoria_id) then
    raise exception 'Solo los socios de la categoría pueden registrar retiros';
  end if;
  -- Bloquea la categoría para que dos retiros simultáneos no superen el saldo
  select nombre into v_cat from categorias where id = new.categoria_id for update;
  select saldo into v_saldo from saldo_categoria where categoria_id = new.categoria_id;
  if new.monto > v_saldo then
    raise exception 'El retiro supera el saldo disponible (%)', v_saldo;
  end if;
  select nombre into v_quien from empleados where id = new.empleado_id;
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select s.empleado_id, 'retiro', 'Retiro registrado',
         v_quien || ' retiró $' || new.monto || ' de ' || v_cat,
         jsonb_build_object('categoria_id', new.categoria_id, 'retiro_id', new.id)
  from socios s
  where s.categoria_id = new.categoria_id and s.activo and s.empleado_id <> new.empleado_id;
  return new;
end $$;

-- Retiros: solo socios de la categoría registran y ven
create policy ret_insert on retiros for insert to authenticated
  with check (es_activo() and empleado_id = auth.uid() and es_socio_categoria(auth.uid(), categoria_id));
create policy ret_read on retiros for select to authenticated
  using (es_activo() and (es_admin() or es_socio_categoria(auth.uid(), categoria_id)));

-- ---------- reporte_socio: sin retiros (ya no son por producto) ----------
drop function reporte_socio(text, date, date);

create function reporte_socio(p_granularidad text, p_desde date, p_hasta date)
returns table (periodo date, producto_id bigint, producto text, unidades bigint, ventas_netas numeric)
language sql stable security invoker set search_path = public as $$
  with base as (
    select m.producto_id, (m.fecha at time zone 'America/Bogota') as fecha_local,
           m.cantidad_neta, m.monto_neto
    from movimientos_producto m
    where es_socio_producto(auth.uid(), m.producto_id)
  ), per as (
    select producto_id, cantidad_neta, monto_neto,
      case p_granularidad
        when 'dia'       then fecha_local::date
        when 'mes'       then date_trunc('month',   fecha_local)::date
        when 'trimestre' then date_trunc('quarter', fecha_local)::date
        when 'anio'      then date_trunc('year',    fecha_local)::date
        when 'semestre'  then make_date(extract(year from fecha_local)::int,
                                        case when extract(month from fecha_local) <= 6 then 1 else 7 end, 1)
      end as periodo
    from base
    where fecha_local::date between p_desde and p_hasta
  )
  select per.periodo, p.id, p.nombre, sum(per.cantidad_neta)::bigint, sum(per.monto_neto)
  from per join productos p on p.id = per.producto_id
  where per.periodo is not null
  group by per.periodo, p.id, p.nombre
  order by per.periodo, p.nombre;
$$;

-- ---------- retiros_socio: retiros por día y categoría ----------
create function retiros_socio(p_desde date, p_hasta date)
returns table (dia date, categoria_id bigint, categoria text, retiros numeric)
language sql stable security invoker set search_path = public as $$
  select (r.fecha at time zone 'America/Bogota')::date, c.id, c.nombre, sum(r.monto)
  from retiros r
  join categorias c on c.id = r.categoria_id
  where es_socio_categoria(auth.uid(), r.categoria_id)
    and (r.fecha at time zone 'America/Bogota')::date between p_desde and p_hasta
  group by 1, c.id, c.nombre
  order by 1, c.nombre;
$$;

revoke all on saldo_categoria from anon;
revoke all on function es_socio_categoria(uuid, bigint), reporte_socio(text, date, date), retiros_socio(date, date) from anon, public;
grant execute on function es_socio_categoria(uuid, bigint), reporte_socio(text, date, date), retiros_socio(date, date) to authenticated;
