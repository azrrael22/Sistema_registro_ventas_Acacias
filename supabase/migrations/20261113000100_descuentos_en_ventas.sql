-- Descuentos al vender: quien registra la venta puede bajar el precio unitario
-- (nunca subirlo). Se guarda el precio de lista para que los socios vean el descuento.

-- ---------- venta_items.precio_lista ----------
alter table venta_items add column precio_lista numeric(12,2) check (precio_lista >= 0);
update venta_items set precio_lista = precio_unitario;  -- antes no había descuentos
alter table venta_items alter column precio_lista set not null;

-- ---------- trg_venta_item: acepta un precio menor o igual al del producto ----------
-- En ventas el precio sale del producto salvo que llegue uno menor (descuento); nunca puede superarlo.
-- En devoluciones de una venta concreta se usan los precios de esa venta.
create or replace function trg_venta_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tipo tipo_venta; v_origen bigint; v_stock bigint; v_lista numeric;
begin
  select tipo, venta_origen_id into v_tipo, v_origen from ventas where id = new.venta_id;
  if v_tipo = 'venta' then
    select precio into v_lista from productos where id = new.producto_id and activo;
    if v_lista is null then raise exception 'Producto inexistente o inactivo'; end if;
    new.precio_lista := v_lista;
    new.precio_unitario := coalesce(new.precio_unitario, v_lista);
    if new.precio_unitario < 0 or new.precio_unitario > v_lista then
      raise exception 'El precio no puede ser negativo ni mayor al del producto (%)', v_lista;
    end if;
    select stock into v_stock from stock_producto where producto_id = new.producto_id;
    if v_stock < new.cantidad then
      raise exception 'Stock insuficiente (disponible: %)', v_stock;
    end if;
  else
    if v_origen is not null then
      select precio_unitario, precio_lista into new.precio_unitario, new.precio_lista from venta_items
      where venta_id = v_origen and producto_id = new.producto_id limit 1;
      if new.precio_unitario is null then
        raise exception 'El producto no hace parte de la venta original';
      end if;
    else
      select precio, precio into new.precio_unitario, new.precio_lista from productos where id = new.producto_id;
      if new.precio_unitario is null then raise exception 'Producto inexistente'; end if;
    end if;
  end if;
  return new;
end $$;

-- ---------- registrar_venta: pasa el precio pedido al trigger ----------
-- p_items: [{"producto_id": 1, "cantidad": 2, "precio_unitario": 4500}, ...]
-- precio_unitario es opcional y solo cuenta en ventas; sin él se cobra el precio del producto.
create or replace function registrar_venta(
  p_items jsonb,
  p_tipo tipo_venta default 'venta',
  p_venta_origen bigint default null,
  p_nota text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_item record; v_disponible bigint;
begin
  if not es_activo() then raise exception 'Tu cuenta aún no ha sido aprobada'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if p_venta_origen is not null and not exists (
    select 1 from ventas where id = p_venta_origen and tipo = 'venta'
  ) then
    raise exception 'La venta original no existe';
  end if;

  -- Bloquea los productos (en orden, para evitar deadlocks) y así el stock no se vende dos veces
  perform 1 from productos
  where id in (select (e->>'producto_id')::bigint from jsonb_array_elements(p_items) e)
  order by id for update;

  insert into ventas (empleado_id, tipo, venta_origen_id, nota)
  values (auth.uid(), p_tipo, p_venta_origen, nullif(trim(p_nota), ''))
  returning id into v_id;

  for v_item in
    select (e->>'producto_id')::bigint as producto_id, sum((e->>'cantidad')::int)::int as cantidad,
           min((e->>'precio_unitario')::numeric) as precio_unitario
    from jsonb_array_elements(p_items) e
    group by 1
  loop
    if p_venta_origen is not null then
      select coalesce(sum(case when v.id = p_venta_origen then vi.cantidad else -vi.cantidad end), 0)
        into v_disponible
      from venta_items vi join ventas v on v.id = vi.venta_id
      where vi.producto_id = v_item.producto_id
        and (v.id = p_venta_origen or (v.venta_origen_id = p_venta_origen and v.id <> v_id));
      if v_item.cantidad > v_disponible then
        raise exception 'No se pueden devolver más unidades de las vendidas (máximo: %)', v_disponible;
      end if;
    end if;
    insert into venta_items (venta_id, producto_id, cantidad, precio_unitario)
    values (v_id, v_item.producto_id, v_item.cantidad, v_item.precio_unitario);  -- null: el trigger pone el del producto
  end loop;

  return v_id;
end $$;
