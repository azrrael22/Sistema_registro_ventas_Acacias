-- =====================================================================
-- Sistema de registro de ventas - Las Acacias (Supabase / PostgreSQL)
-- =====================================================================

-- ---------- 1. TABLAS BASE ----------

-- Perfil del empleado (extiende auth.users de Supabase)
create table empleados (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null,
  es_admin    boolean not null default false,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create table categorias (
  id      bigint generated always as identity primary key,
  nombre  text not null unique,
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
create table socios (
  id            bigint generated always as identity primary key,
  empleado_id   uuid not null references empleados(id),
  categoria_id  bigint not null references categorias(id),
  activo        boolean not null default true,
  ingreso_en    timestamptz not null default now(),
  salio_en      timestamptz
);
create unique index socios_unico on socios(empleado_id, categoria_id) where activo;

-- ¿Es el empleado socio de la categoría de este producto?
create or replace function es_socio_producto(p_empleado uuid, p_producto bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from socios s
    join productos p on p.categoria_id = s.categoria_id
    where s.empleado_id = p_empleado and s.activo and p.id = p_producto
  );
$$;

-- Vista: socios efectivos por producto
create or replace view socios_por_producto as
select s.empleado_id, p.id as producto_id
from socios s
join productos p on p.categoria_id = s.categoria_id
where s.activo;

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
create index on ventas(fecha);

-- Movimientos con signo (+ ventas, - devoluciones). Base de todos los reportes.
create or replace view movimientos_producto with (security_invoker = true) as
select
  vi.producto_id,
  v.fecha,
  v.empleado_id as vendedor_id,
  case when v.tipo = 'venta' then  vi.cantidad else -vi.cantidad end as cantidad_neta,
  case when v.tipo = 'venta' then  vi.cantidad * vi.precio_unitario
                             else -vi.cantidad * vi.precio_unitario end as monto_neto
from venta_items vi join ventas v on v.id = vi.venta_id;

-- ---------- 4. RETIROS DE DINERO ----------
create table retiros (
  id           bigint generated always as identity primary key,
  producto_id  bigint not null references productos(id),
  empleado_id  uuid not null default auth.uid() references empleados(id), -- socio que retira
  monto        numeric(12,2) not null check (monto > 0),
  fecha        timestamptz not null default now(),
  nota         text
);

-- Saldo disponible por producto = ventas netas - retiros
create or replace view saldo_producto with (security_invoker = true) as
select p.id as producto_id, p.nombre,
       coalesce((select sum(monto_neto) from movimientos_producto m where m.producto_id = p.id), 0)
     - coalesce((select sum(monto) from retiros r where r.producto_id = p.id), 0) as saldo
from productos p;

-- ---------- 4b. INVENTARIO ----------
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

-- Stock actual = entradas + ajustes - ventas + devoluciones.
-- Vista sin security_invoker a propósito: todos los empleados deben ver el stock para vender.
create or replace view stock_producto as
select p.id as producto_id, p.nombre,
  coalesce((select sum(cantidad) from inventario_movimientos i where i.producto_id = p.id), 0)
  + coalesce((select sum(case when v.tipo = 'devolucion' then vi.cantidad else -vi.cantidad end)
              from venta_items vi join ventas v on v.id = vi.venta_id
              where vi.producto_id = p.id), 0) as stock
from productos p;

-- Al insertar un ítem: el precio SIEMPRE sale del producto (precio fijo) y no se vende sin stock.
create or replace function trg_venta_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tipo tipo_venta; v_stock bigint;
begin
  select precio into new.precio_unitario from productos where id = new.producto_id and activo;
  if new.precio_unitario is null then raise exception 'Producto inexistente o inactivo'; end if;
  select tipo into v_tipo from ventas where id = new.venta_id;
  if v_tipo = 'venta' then
    select stock into v_stock from stock_producto where producto_id = new.producto_id;
    if v_stock < new.cantidad then
      raise exception 'Stock insuficiente (disponible: %)', v_stock;
    end if;
  end if;
  return new;
end $$;
create trigger venta_items_antes before insert on venta_items for each row execute function trg_venta_item();

alter table inventario_movimientos enable row level security;
create policy inv_read on inventario_movimientos for select to authenticated
  using (es_admin() or es_socio_producto(auth.uid(), producto_id));
create policy inv_insert on inventario_movimientos for insert to authenticated
  with check (empleado_id = auth.uid() and (es_admin() or es_socio_producto(auth.uid(), producto_id)));

-- ---------- 5. NOTIFICACIONES ----------
create table notificaciones (
  id              bigint generated always as identity primary key,
  destinatario_id uuid not null references empleados(id),
  tipo            text not null check (tipo in ('retiro', 'nuevo_socio')),
  titulo          text not null,
  mensaje         text not null,
  datos           jsonb,
  leida           boolean not null default false,
  enviada_correo  boolean not null default false,  -- para un Edge Function que envíe emails
  creada_en       timestamptz not null default now()
);
create index on notificaciones(destinatario_id, leida);

-- Trigger: validar retiro + notificar a los demás socios
create or replace function trg_retiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_prod text; v_quien text;
begin
  if not es_socio_producto(new.empleado_id, new.producto_id) then
    raise exception 'Solo los socios del producto pueden registrar retiros';
  end if;
  if new.monto > (select saldo from saldo_producto where producto_id = new.producto_id) then
    raise exception 'El retiro supera el saldo disponible';
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
create trigger retiros_antes before insert on retiros for each row execute function trg_retiro();

-- Trigger: notificar a los socios existentes cuando entra un socio nuevo a la categoría
create or replace function trg_nuevo_socio() returns trigger
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
create trigger socios_despues after insert on socios for each row execute function trg_nuevo_socio();

-- ---------- 6. RLS (Row Level Security) ----------
alter table empleados      enable row level security;
alter table categorias     enable row level security;
alter table productos      enable row level security;
alter table socios         enable row level security;
alter table ventas         enable row level security;
alter table venta_items    enable row level security;
alter table retiros        enable row level security;
alter table notificaciones enable row level security;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select es_admin from empleados where id = auth.uid()), false) $$;

-- Catálogos: todos leen, solo admin modifica
create policy cat_read  on categorias for select to authenticated using (true);
-- Cualquier empleado puede crear categorías y productos; editar: admin, quien lo creó o un socio
create policy cat_insert on categorias for insert to authenticated with check (creado_por = auth.uid());
create policy cat_update on categorias for update to authenticated using (es_admin() or creado_por = auth.uid());
create policy cat_delete on categorias for delete to authenticated using (es_admin());
create policy prod_read  on productos for select to authenticated using (true);
create policy prod_insert on productos for insert to authenticated with check (creado_por = auth.uid());
create policy prod_update on productos for update to authenticated
  using (es_admin() or creado_por = auth.uid() or es_socio_producto(auth.uid(), id));
create policy prod_delete on productos for delete to authenticated using (es_admin());
create policy emp_read   on empleados for select to authenticated using (true);
create policy emp_update on empleados for update to authenticated using (id = auth.uid() or es_admin());

-- Socios: todos ven quién es socio; cada empleado solo se inscribe/sale él mismo
create policy soc_read   on socios for select to authenticated using (true);
create policy soc_insert on socios for insert to authenticated with check (empleado_id = auth.uid());
create policy soc_update on socios for update to authenticated using (empleado_id = auth.uid() or es_admin());

-- Ventas: cualquier empleado registra (a su nombre); ve las suyas y las de productos donde es socio
create policy ven_insert on ventas for insert to authenticated with check (empleado_id = auth.uid());
create policy ven_read on ventas for select to authenticated using (
  empleado_id = auth.uid() or es_admin() or exists (
    select 1 from venta_items vi where vi.venta_id = ventas.id
      and es_socio_producto(auth.uid(), vi.producto_id))
);
create policy vit_insert on venta_items for insert to authenticated
  with check (exists (select 1 from ventas v where v.id = venta_id and v.empleado_id = auth.uid()));
create policy vit_read on venta_items for select to authenticated using (
  es_admin() or es_socio_producto(auth.uid(), producto_id)
  or exists (select 1 from ventas v where v.id = venta_id and v.empleado_id = auth.uid())
);

-- Retiros: solo socios registran y ven
create policy ret_insert on retiros for insert to authenticated
  with check (empleado_id = auth.uid() and es_socio_producto(auth.uid(), producto_id));
create policy ret_read on retiros for select to authenticated
  using (es_admin() or es_socio_producto(auth.uid(), producto_id));

-- Notificaciones: cada uno ve y marca las suyas
create policy not_read   on notificaciones for select to authenticated using (destinatario_id = auth.uid());
create policy not_update on notificaciones for update to authenticated using (destinatario_id = auth.uid());

-- ---------- 7. REPORTES PARA SOCIOS ----------
-- granularidad: 'mes' | 'trimestre' | 'semestre' | 'anio'
create or replace function reporte_socio(p_granularidad text, p_desde date, p_hasta date)
returns table (periodo date, producto text, unidades bigint, ventas_netas numeric, retiros numeric)
language sql stable security invoker as $$
  with mov as (
    select m.producto_id, m.cantidad_neta, m.monto_neto, m.fecha from movimientos_producto m
    where m.fecha::date between p_desde and p_hasta and es_socio_producto(auth.uid(), m.producto_id)
  ), ret as (
    select r.producto_id, r.monto, r.fecha from retiros r
    where r.fecha::date between p_desde and p_hasta and es_socio_producto(auth.uid(), r.producto_id)
  ), per as (
    select producto_id, fecha,
      case p_granularidad
        when 'mes'       then date_trunc('month',   fecha)::date
        when 'trimestre' then date_trunc('quarter', fecha)::date
        when 'anio'      then date_trunc('year',    fecha)::date
        when 'semestre'  then make_date(extract(year from fecha)::int,
                                        case when extract(month from fecha) <= 6 then 1 else 7 end, 1)
      end as periodo,
      cantidad_neta, monto_neto, 0::numeric as retiro from mov
    union all
    select producto_id, fecha,
      case p_granularidad
        when 'mes'       then date_trunc('month',   fecha)::date
        when 'trimestre' then date_trunc('quarter', fecha)::date
        when 'anio'      then date_trunc('year',    fecha)::date
        when 'semestre'  then make_date(extract(year from fecha)::int,
                                        case when extract(month from fecha) <= 6 then 1 else 7 end, 1)
      end, 0, 0, monto from ret
  )
  select per.periodo, p.nombre, sum(per.cantidad_neta)::bigint, sum(per.monto_neto), sum(per.retiro)
  from per join productos p on p.id = per.producto_id
  group by per.periodo, p.nombre
  order by per.periodo, p.nombre;
$$;
