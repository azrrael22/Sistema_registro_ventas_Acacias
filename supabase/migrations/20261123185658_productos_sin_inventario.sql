-- Productos sin inventario: algunos productos no se manejan por unidades en bodega
-- (p. ej. algo que se prepara al momento). No tienen stock, se venden sin tope y no
-- admiten entradas, ajustes ni conteos. La marca la cambian quienes pueden editar el
-- producto (admin, quien lo creó o un socio), igual que el precio.
-- Si un producto vuelve a llevar inventario, su stock retoma toda la historia: se
-- corrige con un conteo físico.

alter table productos add column maneja_inventario boolean not null default true;
comment on column productos.maneja_inventario is
  'false: el producto no lleva inventario (sin stock, se vende sin tope y no admite movimientos ni conteos)';

-- ---------- stock_producto: null si el producto no lleva inventario ----------
-- Mismas columnas que antes. Sigue sin security_invoker a propósito: todos los empleados
-- deben ver el stock para vender.
create or replace view stock_producto as
select p.id as producto_id, p.nombre,
  case when p.maneja_inventario then
    coalesce((select sum(cantidad) from inventario_movimientos i where i.producto_id = p.id), 0)
    + coalesce((select sum(case when v.tipo = 'devolucion' then vi.cantidad else -vi.cantidad end)
                from venta_items vi join ventas v on v.id = vi.venta_id
                where vi.producto_id = p.id), 0)
  end as stock
from productos p;

-- ---------- trg_venta_item: sin inventario no hay tope de stock ----------
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
    -- Stock null: el producto no lleva inventario y se vende sin tope
    select stock into v_stock from stock_producto where producto_id = new.producto_id;
    if v_stock is not null and v_stock < new.cantidad then
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

-- ---------- Movimientos de inventario: solo de productos que lo llevan ----------
create function trg_movimiento_inventario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not coalesce((select maneja_inventario from productos where id = new.producto_id), true) then
    raise exception 'Este producto no lleva inventario. Actívalo en «Productos y socios» para registrar movimientos';
  end if;
  return new;
end $$;

create trigger inventario_movimientos_antes before insert on inventario_movimientos
  for each row execute function trg_movimiento_inventario();

-- ---------- registrar_conteo: no se cuenta lo que no lleva inventario ----------
-- El socio dice cuántas unidades hay en realidad y la diferencia con el sistema queda como ajuste.
-- Devuelve la diferencia: negativa = faltan (perdidas), positiva = sobran, 0 = cuadra y no se registra nada.
create or replace function registrar_conteo(p_producto bigint, p_contadas integer, p_nota text default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_maneja boolean; v_stock bigint; v_dif integer;
begin
  if not es_activo() then raise exception 'Tu cuenta aún no ha sido aprobada'; end if;
  if not (es_admin() or es_socio_producto(auth.uid(), p_producto)) then
    raise exception 'Solo los socios del producto pueden contarlo' using errcode = 'insufficient_privilege';
  end if;
  if p_contadas is null or p_contadas < 0 then
    raise exception 'Las unidades contadas no pueden ser negativas';
  end if;

  -- Bloquea el producto (como registrar_venta) para que una venta no cambie el stock mientras se compara
  select maneja_inventario into v_maneja from productos where id = p_producto for update;
  if not found then raise exception 'Producto inexistente'; end if;
  if not v_maneja then
    raise exception 'Este producto no lleva inventario. Actívalo en «Productos y socios» para contarlo';
  end if;
  select stock into v_stock from stock_producto where producto_id = p_producto;

  v_dif := p_contadas - v_stock;
  if v_dif <> 0 then
    insert into inventario_movimientos (producto_id, tipo, cantidad, nota)
    values (p_producto, 'ajuste', v_dif,
            'Conteo físico: ' || p_contadas || ' (sistema: ' || v_stock || ')'
            || coalesce(' · ' || nullif(trim(p_nota), ''), ''));
  end if;
  return v_dif;
end $$;

-- ---------- inventario_socio: base, perdidas y quedan solo con inventario ----------
-- base     = stock al inicio del periodo + entradas y ajustes positivos del periodo (sin contar ventas)
-- perdidas = unidades restadas por ajustes o conteos en el periodo (un sobrante no las descuenta)
-- quedan   = stock al final del periodo
-- Así base - perdidas - quedan = unidades vendidas netas en el periodo.
-- precio: el actual del producto, para estimar el valor de lo perdido.
-- Sin inventario (maneja_inventario = false) las tres son null; la fila sigue para mostrar sus ventas.
drop function inventario_socio(date, date);

create function inventario_socio(p_desde date, p_hasta date)
returns table (producto_id bigint, producto text, categoria text, precio numeric,
               unidades_base bigint, unidades_perdidas bigint, unidades_quedan bigint,
               maneja_inventario boolean)
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
    case when p.maneja_inventario then
      (coalesce(sum(mov.entra - mov.pierde - mov.sale) filter (where mov.dia < p_desde), 0)
       + coalesce(sum(mov.entra) filter (where mov.dia between p_desde and p_hasta), 0))::bigint
    end,
    case when p.maneja_inventario then
      coalesce(sum(mov.pierde) filter (where mov.dia between p_desde and p_hasta), 0)::bigint
    end,
    case when p.maneja_inventario then
      coalesce(sum(mov.entra - mov.pierde - mov.sale) filter (where mov.dia <= p_hasta), 0)::bigint
    end,
    p.maneja_inventario
  from productos p
  join categorias c on c.id = p.categoria_id
  left join mov on mov.producto_id = p.id
  where es_socio_producto(auth.uid(), p.id)
  group by p.id, p.nombre, c.nombre, p.precio, p.maneja_inventario
  order by c.nombre, p.nombre;
$$;

revoke all on function inventario_socio(date, date), trg_movimiento_inventario() from anon, public;
grant execute on function inventario_socio(date, date) to authenticated;
