-- =====================================================================
-- Sistema de registro de ventas - Las Acacias (Supabase / PostgreSQL)
-- =====================================================================
-- Orden: tipos y tablas -> vistas -> funciones -> triggers -> RLS -> permisos.
-- Las funciones SQL validan su cuerpo al crearse, por eso van después de las tablas.

-- ---------- 1. TABLAS BASE ----------

-- Perfil del empleado (extiende auth.users de Supabase).
-- Se crea automáticamente al registrarse (trigger en auth.users) y queda
-- inactivo hasta que un administrador lo aprueba.
create table empleados (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  es_admin    boolean not null default false,
  activo      boolean not null default false,
  creado_en   timestamptz not null default now()
);

create table categorias (
  id         bigint generated always as identity primary key,
  nombre     text not null unique,
  creado_por uuid default auth.uid() references empleados(id)
);

create table productos (
  id             bigint generated always as identity primary key,
  categoria_id   bigint not null references categorias(id),
  nombre         text not null,
  precio         numeric(12,2) not null check (precio >= 0),  -- precio FIJO del producto
  activo         boolean not null default true,
  creado_por     uuid default auth.uid() references empleados(id),
  unique (categoria_id, nombre)
);

-- ---------- 2. SOCIEDADES (solo por CATEGORÍA) ----------
-- Ser socio de una categoría = ser socio de todos sus productos.
-- Una categoría con un único socio (ej: alfajores) es simplemente una fila.
-- Salir de la sociedad = activo false (se conserva el historial).
create table socios (
  id            bigint generated always as identity primary key,
  empleado_id   uuid not null references empleados(id),
  categoria_id  bigint not null references categorias(id),
  activo        boolean not null default true,
  ingreso_en    timestamptz not null default now(),
  salio_en      timestamptz
);
create unique index socios_unico on socios(empleado_id, categoria_id) where activo;

-- ---------- 3. VENTAS Y DEVOLUCIONES ----------
create type tipo_venta as enum ('venta', 'devolucion');

create table ventas (
  id               bigint generated always as identity primary key,
  empleado_id      uuid not null default auth.uid() references empleados(id), -- quien registra
  tipo             tipo_venta not null default 'venta',
  venta_origen_id  bigint references ventas(id), -- solo para devoluciones (opcional)
  fecha            timestamptz not null default now(),
  nota             text,
  check (tipo = 'devolucion' or venta_origen_id is null)
);

create table venta_items (
  id               bigint generated always as identity primary key,
  venta_id         bigint not null references ventas(id) on delete cascade,
  producto_id      bigint not null references productos(id),
  cantidad         integer not null check (cantidad > 0),
  precio_unitario  numeric(12,2) not null check (precio_unitario >= 0)
);
create index on venta_items(producto_id);
create index on venta_items(venta_id);
create index on ventas(fecha);
create index on ventas(venta_origen_id);

-- ---------- 4. RETIROS DE DINERO ----------
create table retiros (
  id           bigint generated always as identity primary key,
  producto_id  bigint not null references productos(id),
  empleado_id  uuid not null default auth.uid() references empleados(id), -- socio que retira
  monto        numeric(12,2) not null check (monto > 0),
  fecha        timestamptz not null default now(),
  nota         text
);
create index on retiros(producto_id);

-- ---------- 5. INVENTARIO ----------
-- Entradas de mercancía (compras/reposición) y ajustes (+ o -, p. ej. pérdidas o conteo).
-- Las ventas y devoluciones mueven el stock automáticamente (no se duplican aquí).
create type tipo_mov_inventario as enum ('entrada', 'ajuste');

create table inventario_movimientos (
  id           bigint generated always as identity primary key,
  producto_id  bigint not null references productos(id),
  empleado_id  uuid not null default auth.uid() references empleados(id),
  tipo         tipo_mov_inventario not null,
  cantidad     integer not null check (cantidad <> 0 and (tipo = 'ajuste' or cantidad > 0)),
  fecha        timestamptz not null default now(),
  nota         text
);
create index on inventario_movimientos(producto_id);

-- ---------- 6. NOTIFICACIONES ----------
create table notificaciones (
  id              bigint generated always as identity primary key,
  destinatario_id uuid not null references empleados(id) on delete cascade,
  tipo            text not null check (tipo in ('retiro', 'nuevo_socio', 'registro_pendiente', 'cuenta_aprobada')),
  titulo          text not null,
  mensaje         text not null,
  datos           jsonb,
  leida           boolean not null default false,
  enviada_correo  boolean not null default false,  -- lo marca la Edge Function que envía emails
  creada_en       timestamptz not null default now()
);
create index on notificaciones(destinatario_id, leida);

-- ---------- 7. VISTAS ----------

-- Socios efectivos por producto
create view socios_por_producto as
select s.empleado_id, p.id as producto_id
from socios s
join productos p on p.categoria_id = s.categoria_id
where s.activo;

-- Movimientos con signo (+ ventas, - devoluciones). Base de todos los reportes.
create view movimientos_producto with (security_invoker = true) as
select
  vi.producto_id,
  v.fecha,
  v.empleado_id as vendedor_id,
  case when v.tipo = 'venta' then  vi.cantidad else -vi.cantidad end as cantidad_neta,
  case when v.tipo = 'venta' then  vi.cantidad * vi.precio_unitario
                             else -vi.cantidad * vi.precio_unitario end as monto_neto
from venta_items vi join ventas v on v.id = vi.venta_id;

-- Saldo disponible por producto = ventas netas - retiros
create view saldo_producto with (security_invoker = true) as
select p.id as producto_id, p.nombre,
       coalesce((select sum(monto_neto) from movimientos_producto m where m.producto_id = p.id), 0)
     - coalesce((select sum(monto) from retiros r where r.producto_id = p.id), 0) as saldo
from productos p;

-- Stock actual = entradas + ajustes - ventas + devoluciones.
-- Vista sin security_invoker a propósito: todos los empleados deben ver el stock para vender.
create view stock_producto as
select p.id as producto_id, p.nombre,
  coalesce((select sum(cantidad) from inventario_movimientos i where i.producto_id = p.id), 0)
  + coalesce((select sum(case when v.tipo = 'devolucion' then vi.cantidad else -vi.cantidad end)
              from venta_items vi join ventas v on v.id = vi.venta_id
              where vi.producto_id = p.id), 0) as stock
from productos p;

-- ---------- 8. FUNCIONES AUXILIARES (usadas por las políticas RLS) ----------

-- Empleado aprobado por un admin
create function es_activo() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select activo from empleados where id = auth.uid()), false) $$;

create function es_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select es_admin and activo from empleados where id = auth.uid()), false) $$;

-- ¿Es el empleado socio de la categoría de este producto?
create function es_socio_producto(p_empleado uuid, p_producto bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from socios s
    join productos p on p.categoria_id = s.categoria_id
    where s.empleado_id = p_empleado and s.activo and p.id = p_producto
  );
$$;

-- Usadas por las políticas de ventas/venta_items: si cada política consultara la
-- otra tabla directamente habría recursión infinita de RLS.
create function es_mi_venta(p_venta bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from ventas where id = p_venta and empleado_id = auth.uid()) $$;

create function venta_de_mis_productos(p_venta bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from venta_items vi
    where vi.venta_id = p_venta and es_socio_producto(auth.uid(), vi.producto_id)
  );
$$;

-- ---------- 9. TRIGGERS ----------

-- Alta automática del perfil al registrarse + aviso a los admins para aprobarlo
create function trg_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  v_nombre := coalesce(nullif(trim(new.raw_user_meta_data->>'nombre'), ''), split_part(new.email, '@', 1));
  insert into empleados (id, nombre, email) values (new.id, v_nombre, new.email);
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select e.id, 'registro_pendiente', 'Nuevo registro pendiente',
         v_nombre || ' (' || new.email || ') se registró y espera aprobación',
         jsonb_build_object('empleado_id', new.id)
  from empleados e
  where e.es_admin and e.activo;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function trg_nuevo_usuario();

-- Al insertar un ítem: el precio SIEMPRE sale del producto (precio fijo) y no se vende sin stock.
-- En devoluciones de una venta concreta se usa el precio que se cobró en esa venta.
create function trg_venta_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tipo tipo_venta; v_origen bigint; v_stock bigint;
begin
  select tipo, venta_origen_id into v_tipo, v_origen from ventas where id = new.venta_id;
  if v_tipo = 'venta' then
    select precio into new.precio_unitario from productos where id = new.producto_id and activo;
    if new.precio_unitario is null then raise exception 'Producto inexistente o inactivo'; end if;
    select stock into v_stock from stock_producto where producto_id = new.producto_id;
    if v_stock < new.cantidad then
      raise exception 'Stock insuficiente (disponible: %)', v_stock;
    end if;
  else
    if v_origen is not null then
      select precio_unitario into new.precio_unitario from venta_items
      where venta_id = v_origen and producto_id = new.producto_id limit 1;
      if new.precio_unitario is null then
        raise exception 'El producto no hace parte de la venta original';
      end if;
    else
      select precio into new.precio_unitario from productos where id = new.producto_id;
      if new.precio_unitario is null then raise exception 'Producto inexistente'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger venta_items_antes before insert on venta_items
  for each row execute function trg_venta_item();

-- Validar retiro + notificar a los demás socios
create function trg_retiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prod text; v_quien text; v_saldo numeric;
begin
  if not es_socio_producto(new.empleado_id, new.producto_id) then
    raise exception 'Solo los socios del producto pueden registrar retiros';
  end if;
  -- Bloquea el producto para que dos retiros simultáneos no superen el saldo
  perform 1 from productos where id = new.producto_id for update;
  select saldo into v_saldo from saldo_producto where producto_id = new.producto_id;
  if new.monto > v_saldo then
    raise exception 'El retiro supera el saldo disponible (%)', v_saldo;
  end if;
  select nombre into v_prod from productos where id = new.producto_id;
  select nombre into v_quien from empleados where id = new.empleado_id;
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select sp.empleado_id, 'retiro', 'Retiro registrado',
         v_quien || ' retiró $' || new.monto || ' de ' || v_prod,
         jsonb_build_object('producto_id', new.producto_id, 'retiro_id', new.id)
  from socios_por_producto sp
  where sp.producto_id = new.producto_id and sp.empleado_id <> new.empleado_id;
  return new;
end $$;
create trigger retiros_antes before insert on retiros
  for each row execute function trg_retiro();

-- Notificar a los socios existentes cuando entra un socio nuevo a la categoría
create function trg_nuevo_socio() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_quien text; v_cat text;
begin
  select nombre into v_quien from empleados  where id = new.empleado_id;
  select nombre into v_cat   from categorias where id = new.categoria_id;
  insert into notificaciones (destinatario_id, tipo, titulo, mensaje, datos)
  select s.empleado_id, 'nuevo_socio', 'Nuevo socio',
         v_quien || ' ahora es socio de la categoría ' || v_cat,
         jsonb_build_object('socio_id', new.id, 'categoria_id', new.categoria_id)
  from socios s
  where s.activo and s.categoria_id = new.categoria_id and s.empleado_id <> new.empleado_id;
  return new;
end $$;
create trigger socios_despues after insert on socios
  for each row execute function trg_nuevo_socio();

-- ---------- 10. RPCs (llamadas desde la app) ----------

-- Registra una venta o devolución completa en una sola transacción.
-- p_items: [{"producto_id": 1, "cantidad": 2}, ...]
create function registrar_venta(
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
    select (e->>'producto_id')::bigint as producto_id, sum((e->>'cantidad')::int)::int as cantidad
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
    values (v_id, v_item.producto_id, v_item.cantidad, 0);  -- el trigger fija el precio real
  end loop;

  return v_id;
end $$;

-- Aprobar / desactivar empleados y asignar admin. Solo administradores.
create function actualizar_empleado(p_id uuid, p_activo boolean, p_es_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_estaba_activo boolean;
begin
  if not es_admin() then raise exception 'Solo los administradores pueden hacer esto'; end if;
  if p_id = auth.uid() and (not p_activo or not p_es_admin) then
    raise exception 'No puedes quitarte tus propios permisos';
  end if;
  select activo into v_estaba_activo from empleados where id = p_id for update;
  if not found then raise exception 'Empleado no encontrado'; end if;
  update empleados set activo = p_activo, es_admin = p_es_admin where id = p_id;
  if p_activo and not v_estaba_activo then
    insert into notificaciones (destinatario_id, tipo, titulo, mensaje)
    values (p_id, 'cuenta_aprobada', 'Cuenta aprobada', 'Tu cuenta fue aprobada. Ya puedes registrar ventas.');
  end if;
end $$;

-- ---------- 11. REPORTES PARA SOCIOS ----------
-- granularidad: 'mes' | 'trimestre' | 'semestre' | 'anio'
-- Las fechas se agrupan en hora de Colombia (no en UTC).
create function reporte_socio(p_granularidad text, p_desde date, p_hasta date)
returns table (periodo date, producto text, unidades bigint, ventas_netas numeric, retiros numeric)
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
        when 'mes'       then date_trunc('month',   fecha_local)::date
        when 'trimestre' then date_trunc('quarter', fecha_local)::date
        when 'anio'      then date_trunc('year',    fecha_local)::date
        when 'semestre'  then make_date(extract(year from fecha_local)::int,
                                        case when extract(month from fecha_local) <= 6 then 1 else 7 end, 1)
      end as periodo
    from base
    where fecha_local::date between p_desde and p_hasta
  )
  select per.periodo, p.nombre, sum(per.cantidad_neta)::bigint, sum(per.monto_neto), sum(per.retiro)
  from per join productos p on p.id = per.producto_id
  where per.periodo is not null
  group by per.periodo, p.nombre
  order by per.periodo, p.nombre;
$$;

-- ---------- 12. RLS (Row Level Security) ----------
alter table empleados              enable row level security;
alter table categorias             enable row level security;
alter table productos              enable row level security;
alter table socios                 enable row level security;
alter table ventas                 enable row level security;
alter table venta_items            enable row level security;
alter table retiros                enable row level security;
alter table inventario_movimientos enable row level security;
alter table notificaciones         enable row level security;

-- Empleados: los activos ven a todos; un pendiente solo se ve a sí mismo.
-- Solo se puede cambiar el propio nombre (ver permisos por columna abajo);
-- activo/es_admin se cambian con la RPC actualizar_empleado.
create policy emp_read   on empleados for select to authenticated using (es_activo() or id = auth.uid());
create policy emp_update on empleados for update to authenticated using (id = auth.uid());

-- Catálogos: cualquier empleado activo lee y crea; editar: admin, quien lo creó o un socio
create policy cat_read   on categorias for select to authenticated using (es_activo());
create policy cat_insert on categorias for insert to authenticated
  with check (es_activo() and creado_por = auth.uid());
create policy cat_update on categorias for update to authenticated
  using (es_admin() or (es_activo() and creado_por = auth.uid()));
create policy cat_delete on categorias for delete to authenticated using (es_admin());

create policy prod_read   on productos for select to authenticated using (es_activo());
create policy prod_insert on productos for insert to authenticated
  with check (es_activo() and creado_por = auth.uid());
create policy prod_update on productos for update to authenticated
  using (es_admin() or (es_activo() and (creado_por = auth.uid() or es_socio_producto(auth.uid(), id))));
create policy prod_delete on productos for delete to authenticated using (es_admin());

-- Socios: todos ven quién es socio; cada empleado solo se inscribe él mismo.
-- El update solo sirve para salir de la sociedad (activo = false).
create policy soc_read   on socios for select to authenticated using (es_activo());
create policy soc_insert on socios for insert to authenticated
  with check (es_activo() and empleado_id = auth.uid() and activo);
create policy soc_update on socios for update to authenticated
  using (es_admin() or (es_activo() and empleado_id = auth.uid()))
  with check (not activo);

-- Ventas: se insertan solo vía la RPC registrar_venta (no hay política de insert).
-- Cada uno ve las suyas y las de productos donde es socio.
create policy ven_read on ventas for select to authenticated using (
  es_activo() and (empleado_id = auth.uid() or es_admin() or venta_de_mis_productos(id))
);
create policy vit_read on venta_items for select to authenticated using (
  es_activo() and (es_admin() or es_socio_producto(auth.uid(), producto_id) or es_mi_venta(venta_id))
);

-- Retiros: solo socios registran y ven
create policy ret_insert on retiros for insert to authenticated
  with check (es_activo() and empleado_id = auth.uid() and es_socio_producto(auth.uid(), producto_id));
create policy ret_read on retiros for select to authenticated
  using (es_activo() and (es_admin() or es_socio_producto(auth.uid(), producto_id)));

-- Inventario: solo socios (o admin) registran y ven movimientos
create policy inv_read on inventario_movimientos for select to authenticated
  using (es_activo() and (es_admin() or es_socio_producto(auth.uid(), producto_id)));
create policy inv_insert on inventario_movimientos for insert to authenticated
  with check (es_activo() and empleado_id = auth.uid()
              and (es_admin() or es_socio_producto(auth.uid(), producto_id)));

-- Notificaciones: cada uno ve y marca las suyas
create policy not_read   on notificaciones for select to authenticated using (destinatario_id = auth.uid());
create policy not_update on notificaciones for update to authenticated using (destinatario_id = auth.uid());

-- ---------- 13. PERMISOS ----------
-- Nada es accesible sin iniciar sesión
revoke all on all tables    in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke all on all sequences in schema public from anon;

-- Columnas editables por los usuarios (el resto solo por RPC / triggers)
revoke update on empleados, socios, notificaciones from authenticated;
grant  update (nombre)            on empleados      to authenticated;
grant  update (activo, salio_en)  on socios         to authenticated;
grant  update (leida)             on notificaciones to authenticated;
revoke insert, delete on ventas, venta_items, notificaciones, empleados from authenticated;

-- Funciones que la app puede llamar
grant execute on function
  es_activo(), es_admin(), es_socio_producto(uuid, bigint),
  es_mi_venta(bigint), venta_de_mis_productos(bigint),
  registrar_venta(jsonb, tipo_venta, bigint, text),
  actualizar_empleado(uuid, boolean, boolean),
  reporte_socio(text, date, date)
to authenticated;

-- Campanita en tiempo real
alter publication supabase_realtime add table notificaciones;
