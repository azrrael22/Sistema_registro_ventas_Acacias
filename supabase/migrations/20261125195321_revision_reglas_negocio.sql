-- Reglas que la base de datos aún no imponía:
-- 1. Una devolución siempre es de una venta registrada (la app nunca hizo devoluciones sueltas,
--    pero la RPC las aceptaba sin tope).
-- 2. El aviso de un retiro muestra el monto como el resto de la app ($150.000, no $150000.00).
-- 3. Solo los socios de la categoría (o un admin) agregan productos, como ya mostraba la pantalla.

-- ---------- 1. registrar_venta: devoluciones solo con venta de origen ----------
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
  if p_tipo = 'devolucion' and p_venta_origen is null then
    raise exception 'Una devolución debe ser de una venta registrada';
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

-- ---------- 2. trg_retiro: el monto del aviso en pesos, sin decimales ----------
-- to_char con ',' literal no depende de lc_numeric; luego se cambia por el punto de miles
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
         v_quien || ' retiró $' || replace(to_char(new.monto, 'FM999,999,999,990'), ',', '.') || ' de ' || v_cat,
         jsonb_build_object('categoria_id', new.categoria_id, 'retiro_id', new.id)
  from socios s
  where s.categoria_id = new.categoria_id and s.activo and s.empleado_id <> new.empleado_id;
  return new;
end $$;

-- ---------- 3. Productos: solo los agregan socios de la categoría o un admin ----------
drop policy prod_insert on productos;
create policy prod_insert on productos for insert to authenticated
  with check (es_activo() and creado_por = auth.uid()
              and (es_admin() or es_socio_categoria(auth.uid(), categoria_id)));
