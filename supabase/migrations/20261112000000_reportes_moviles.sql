-- Reportes por periodos móviles (último mes, trimestre, semestre o año hasta hoy).
-- La app agrupa en semanas o meses móviles a partir de filas diarias y necesita
-- el inventario del periodo: base (stock inicial + entradas) y lo que queda al final.

-- ---------- reporte_socio: granularidad 'dia' y producto_id ----------
-- Se agrega producto_id porque el nombre del producto solo es único dentro de su categoría.
drop function reporte_socio(text, date, date);

create function reporte_socio(p_granularidad text, p_desde date, p_hasta date)
returns table (periodo date, producto_id bigint, producto text, unidades bigint, ventas_netas numeric, retiros numeric)
language sql stable security invoker set search_path = public as $$
  with base as (
    select m.producto_id, (m.fecha at time zone 'America/Bogota') as fecha_local,
           m.cantidad_neta, m.monto_neto, 0::numeric as retiro
    from movimientos_producto m
    where es_socio_producto(auth.uid(), m.producto_id)
    union all
    select r.producto_id, (r.fecha at time zone 'America/Bogota'), 0, 0, r.monto
    from retiros r
    where es_socio_producto(auth.uid(), r.producto_id)
  ), per as (
    select producto_id, cantidad_neta, monto_neto, retiro,
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
  select per.periodo, p.id, p.nombre, sum(per.cantidad_neta)::bigint, sum(per.monto_neto), sum(per.retiro)
  from per join productos p on p.id = per.producto_id
  where per.periodo is not null
  group by per.periodo, p.id, p.nombre
  order by per.periodo, p.nombre;
$$;

-- ---------- inventario_socio: unidades del periodo por producto ----------
-- base   = stock al inicio del periodo + entradas y ajustes del periodo (sin contar ventas)
-- quedan = stock al final del periodo
-- Así base - quedan = unidades vendidas netas en el periodo.
create function inventario_socio(p_desde date, p_hasta date)
returns table (producto_id bigint, producto text, categoria text, unidades_base bigint, unidades_quedan bigint)
language sql stable security invoker set search_path = public as $$
  with mov as (
    select i.producto_id, (i.fecha at time zone 'America/Bogota')::date as dia, i.cantidad as entra, 0 as sale
    from inventario_movimientos i
    union all
    select m.producto_id, (m.fecha at time zone 'America/Bogota')::date, 0, m.cantidad_neta
    from movimientos_producto m
  )
  select p.id, p.nombre, c.nombre,
    (coalesce(sum(mov.entra - mov.sale) filter (where mov.dia < p_desde), 0)
     + coalesce(sum(mov.entra) filter (where mov.dia between p_desde and p_hasta), 0))::bigint,
    coalesce(sum(mov.entra - mov.sale) filter (where mov.dia <= p_hasta), 0)::bigint
  from productos p
  join categorias c on c.id = p.categoria_id
  left join mov on mov.producto_id = p.id
  where es_socio_producto(auth.uid(), p.id)
  group by p.id, p.nombre, c.nombre
  order by c.nombre, p.nombre;
$$;

revoke all on function reporte_socio(text, date, date), inventario_socio(date, date) from anon, public;
grant execute on function reporte_socio(text, date, date), inventario_socio(date, date) to authenticated;
