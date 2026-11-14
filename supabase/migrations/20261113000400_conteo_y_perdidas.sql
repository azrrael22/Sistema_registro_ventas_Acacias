-- Unidades perdidas: cuando se recuenta la mercancía y no cuadra (el sistema dice 9 y hay 8),
-- el faltante queda como ajuste negativo y los reportes lo muestran aparte, en vez de esconderlo en la base.

-- ---------- inventario_socio: base, perdidas y quedan ----------
-- base     = stock al inicio del periodo + entradas y ajustes positivos del periodo (sin contar ventas)
-- perdidas = unidades restadas por ajustes o conteos en el periodo (un sobrante no las descuenta)
-- quedan   = stock al final del periodo
-- Así base - perdidas - quedan = unidades vendidas netas en el periodo.
-- precio: el actual del producto, para estimar el valor de lo perdido.
drop function inventario_socio(date, date);

create function inventario_socio(p_desde date, p_hasta date)
returns table (producto_id bigint, producto text, categoria text, precio numeric,
               unidades_base bigint, unidades_perdidas bigint, unidades_quedan bigint)
language sql stable security invoker set search_path = public as $$
  with mov as (
    -- Solo los ajustes pueden ser negativos: lo que restan es lo que se perdió
    select i.producto_id, (i.fecha at time zone 'America/Bogota')::date as dia,
           greatest(i.cantidad, 0) as entra, greatest(-i.cantidad, 0) as pierde, 0 as sale
    from inventario_movimientos i
    union all
    select m.producto_id, (m.fecha at time zone 'America/Bogota')::date, 0, 0, m.cantidad_neta
    from movimientos_producto m
  )
  select p.id, p.nombre, c.nombre, p.precio,
    (coalesce(sum(mov.entra - mov.pierde - mov.sale) filter (where mov.dia < p_desde), 0)
     + coalesce(sum(mov.entra) filter (where mov.dia between p_desde and p_hasta), 0))::bigint,
    coalesce(sum(mov.pierde) filter (where mov.dia between p_desde and p_hasta), 0)::bigint,
    coalesce(sum(mov.entra - mov.pierde - mov.sale) filter (where mov.dia <= p_hasta), 0)::bigint
  from productos p
  join categorias c on c.id = p.categoria_id
  left join mov on mov.producto_id = p.id
  where es_socio_producto(auth.uid(), p.id)
  group by p.id, p.nombre, c.nombre, p.precio
  order by c.nombre, p.nombre;
$$;

-- ---------- registrar_conteo: conteo físico ----------
-- El socio dice cuántas unidades hay en realidad y la diferencia con el sistema queda como ajuste.
-- Devuelve la diferencia: negativa = faltan (perdidas), positiva = sobran, 0 = cuadra y no se registra nada.
create function registrar_conteo(p_producto bigint, p_contadas integer, p_nota text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_stock bigint; v_dif integer;
begin
  if not es_activo() then raise exception 'Tu cuenta aún no ha sido aprobada'; end if;
  if not (es_admin() or es_socio_producto(auth.uid(), p_producto)) then
    raise exception 'Solo los socios del producto pueden contarlo' using errcode = 'insufficient_privilege';
  end if;
  if p_contadas is null or p_contadas < 0 then
    raise exception 'Las unidades contadas no pueden ser negativas';
  end if;

  -- Bloquea el producto (como registrar_venta) para que una venta no cambie el stock mientras se compara
  perform 1 from productos where id = p_producto for update;
  select stock into v_stock from stock_producto where producto_id = p_producto;
  if v_stock is null then raise exception 'Producto inexistente'; end if;

  v_dif := p_contadas - v_stock;
  if v_dif <> 0 then
    insert into inventario_movimientos (producto_id, tipo, cantidad, nota)
    values (p_producto, 'ajuste', v_dif,
            'Conteo físico: ' || p_contadas || ' (sistema: ' || v_stock || ')'
            || coalesce(' · ' || nullif(trim(p_nota), ''), ''));
  end if;
  return v_dif;
end $$;

revoke all on function inventario_socio(date, date), registrar_conteo(bigint, integer, text) from anon, public;
grant execute on function inventario_socio(date, date), registrar_conteo(bigint, integer, text) to authenticated;
