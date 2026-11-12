-- Prueba de reglas de negocio y permisos (RLS). Se ejecuta dentro de una transacción con ROLLBACK.
-- Uso: docker exec -i supabase_db_Sistema_registro_ventas_Acacias psql -U postgres -q < supabase/tests/reglas_negocio.sql
\set ON_ERROR_STOP on
begin;

-- Partir de un catálogo vacío (todo se revierte al final)
delete from productos; delete from categorias;

-- Usuarios: admin + A, B, C, D, E(pendiente)
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','admin@x.co','authenticated','authenticated','{"nombre":"Admin"}');
update empleados set es_admin = true, activo = true where email = 'admin@x.co';
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001','a@x.co','authenticated','authenticated','{"nombre":"Ana"}'),
 ('00000000-0000-0000-0000-000000000002','b@x.co','authenticated','authenticated','{"nombre":"Beto"}'),
 ('00000000-0000-0000-0000-000000000003','c@x.co','authenticated','authenticated','{"nombre":"Caro"}'),
 ('00000000-0000-0000-0000-000000000004','d@x.co','authenticated','authenticated','{}'),
 ('00000000-0000-0000-0000-000000000005','e@x.co','authenticated','authenticated','{"nombre":"Eva"}');

do $$ begin
  assert (select count(*) from empleados) = 6, 'perfiles creados';
  assert (select count(*) from empleados where activo) = 1, 'solo admin activo';
  assert (select count(*) from notificaciones where tipo='registro_pendiente') = 5, 'admin notificado 5 veces';
  assert (select nombre from empleados where email='d@x.co') = 'd', 'nombre por defecto';
end $$;

create temp table r(k text primary key, v bigint);
grant all on r to authenticated;

-- ===== Como E (pendiente): no ve nada, no puede auto-aprobarse =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005"}';
do $$ begin
  assert (select count(*) from empleados) = 1, 'pendiente solo se ve a sí mismo';
  begin
    update empleados set activo = true where id = auth.uid();
    assert false, 'no debería poder auto-activarse';
  exception when insufficient_privilege then null; end;
  begin
    update empleados set es_admin = true where id = auth.uid();
    assert false, 'no debería poder hacerse admin';
  exception when insufficient_privilege then null; end;
  begin
    perform actualizar_empleado(auth.uid(), true, true);
    assert false, 'RPC solo admin';
  exception when raise_exception then null; end;
  begin
    insert into categorias (nombre) values ('hack');
    assert false, 'pendiente no crea categorias';
  exception when insufficient_privilege then null; end;
end $$;
update empleados set nombre = 'Eva M' where id = auth.uid();  -- sí puede cambiar su nombre

-- ===== Admin aprueba A, B, C, D =====
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a"}';
select actualizar_empleado(id, true, false) from empleados where email in ('a@x.co','b@x.co','c@x.co','d@x.co');
do $$ begin
  assert (select count(*) from empleados) = 6, 'admin ve todos';
  begin perform actualizar_empleado(auth.uid(), true, false); assert false;
  exception when raise_exception then null; end;
end $$;

-- ===== Como A: crea categorías y productos, se hace socio de todo =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
insert into categorias (nombre) values ('Pines'),('Repelentes'),('Camisetas'),('Alfajores');
insert into productos (categoria_id, nombre, precio)
select id, nombre || ' std', case nombre when 'Pines' then 5000 when 'Repelentes' then 12000
                                         when 'Camisetas' then 30000 else 3000 end from categorias;
insert into socios (empleado_id, categoria_id) select auth.uid(), id from categorias;
insert into inventario_movimientos (producto_id, tipo, cantidad)
select id, 'entrada', 10 from productos;

-- ===== B socio de pines; C de repelentes y camisetas; D de camisetas =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002"}';
insert into socios (empleado_id, categoria_id) select auth.uid(), id from categorias where nombre='Pines';
do $$ begin
  begin
    insert into socios (empleado_id, categoria_id)
    select '00000000-0000-0000-0000-000000000003', id from categorias where nombre='Pines';
    assert false, 'no puede inscribir a otro';
  exception when insufficient_privilege then null; end;
  begin
    insert into inventario_movimientos (producto_id, tipo, cantidad)
    select p.id, 'entrada', 5 from productos p join categorias c on c.id=p.categoria_id where c.nombre='Alfajores';
    assert false, 'no socio no mueve inventario';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';
insert into socios (empleado_id, categoria_id) select auth.uid(), id from categorias where nombre in ('Repelentes','Camisetas');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000004"}';
insert into socios (empleado_id, categoria_id) select auth.uid(), id from categorias where nombre='Camisetas';

-- ===== B (no socio de alfajores ni repelentes) vende de todo =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002"}';
insert into r select 'venta_b', registrar_venta(
  (select jsonb_agg(jsonb_build_object('producto_id', id, 'cantidad', 2)) from productos), 'venta', null, 'mixta');
do $$ declare v_id bigint := (select v from r where k='venta_b'); begin
  assert (select count(*) from venta_items where venta_id = v_id) = 4, '4 items';
  -- Stock insuficiente
  begin
    perform registrar_venta(jsonb_build_array(jsonb_build_object('producto_id',
      (select id from productos where nombre='Alfajores std'), 'cantidad', 9)));
    assert false, 'stock insuficiente';
  exception when raise_exception then null; end;
  -- Devolver más de lo vendido
  begin
    perform registrar_venta(jsonb_build_array(jsonb_build_object('producto_id',
      (select id from productos where nombre='Pines std'), 'cantidad', 3)), 'devolucion', v_id);
    assert false, 'devolución excesiva';
  exception when raise_exception then null; end;
  -- No puede insertar ventas directamente
  begin
    insert into ventas (tipo) values ('venta');
    assert false, 'insert directo prohibido';
  exception when insufficient_privilege then null; end;
  -- Retiro de repelentes: B no es socio
  begin
    insert into retiros (producto_id, monto) select id, 1000 from productos where nombre='Repelentes std';
    assert false, 'B no retira repelentes';
  exception when insufficient_privilege or raise_exception then null; end;
end $$;
-- Devolución válida de 1 pin (en dos pasos: 1 y luego 1 => total 2 = lo vendido)
select registrar_venta(jsonb_build_array(jsonb_build_object('producto_id',
  (select id from productos where nombre='Pines std'), 'cantidad', 1)), 'devolucion', (select v from r where k='venta_b'));
select registrar_venta(jsonb_build_array(jsonb_build_object('producto_id',
  (select id from productos where nombre='Pines std'), 'cantidad', 1)), 'devolucion', (select v from r where k='venta_b'));
do $$ begin
  begin
    perform registrar_venta(jsonb_build_array(jsonb_build_object('producto_id',
      (select id from productos where nombre='Pines std'), 'cantidad', 1)), 'devolucion', (select v from r where k='venta_b'));
    assert false, 'ya se devolvió todo';
  exception when raise_exception then null; end;
end $$;

-- ===== A retira de repelentes (C debe ser notificado) =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001"}';
do $$ begin
  assert (select stock from stock_producto where nombre='Pines std') = 10, 'stock pines repuesto';
  assert (select stock from stock_producto where nombre='Repelentes std') = 8, 'stock repelentes';
  assert (select saldo from saldo_producto where nombre='Repelentes std') = 24000, 'saldo repelentes';
  assert (select saldo from saldo_producto where nombre='Pines std') = 0, 'saldo pines tras devolución';
  begin
    insert into retiros (producto_id, monto) select id, 30000 from productos where nombre='Repelentes std';
    assert false, 'supera saldo';
  exception when raise_exception then null; end;
end $$;
insert into retiros (producto_id, monto) select id, 20000 from productos where nombre='Repelentes std';
-- Salir de la sociedad de pines y no poder reactivar por update
update socios set activo = false, salio_en = now()
where empleado_id = auth.uid() and categoria_id = (select id from categorias where nombre='Pines');
do $$ begin
  begin
    update socios set activo = true where empleado_id = auth.uid();
    assert false, 'no reactivar por update';
  exception when insufficient_privilege then null; end;
end $$;

-- ===== C revisa notificaciones y reporte =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003"}';
do $$ begin
  assert (select count(*) from notificaciones where tipo='retiro') = 1, 'C notificado del retiro';
  assert (select count(*) from notificaciones where tipo='nuevo_socio') = 1, 'C notificado de D en camisetas';
  assert (select count(*) from notificaciones) = 3, 'C: aprobada + retiro + nuevo socio';
  assert (select count(*) from reporte_socio('trimestre', '2020-01-01', '2100-01-01')) = 2, 'C ve 2 productos';
  assert (select retiros from reporte_socio('anio', '2020-01-01', '2100-01-01') where producto='Repelentes std') = 20000;
  assert (select sum(ventas_netas) from reporte_socio('dia', '2020-01-01', '2100-01-01'))
       = (select sum(ventas_netas) from reporte_socio('anio', '2020-01-01', '2100-01-01')), 'por día suma igual que por año';
  assert (select unidades_base from inventario_socio('2020-01-01', '2100-01-01') where producto='Repelentes std') = 10, 'base repelentes';
  assert (select unidades_quedan from inventario_socio('2020-01-01', '2100-01-01') where producto='Repelentes std') = 8, 'quedan repelentes';
  assert (select sum(unidades_base - unidades_quedan) from inventario_socio('2020-01-01', '2100-01-01'))
       = (select sum(unidades) from reporte_socio('anio', '2020-01-01', '2100-01-01')), 'base - quedan = vendidas';
  assert (select unidades_base from inventario_socio('2100-01-01', '2100-01-01') where producto='Repelentes std') = 8,
         'periodo futuro: la base es el stock que quedó';
  assert (select count(*) from ventas) = 1, 'C ve la venta de B (es socio de items)';
  assert (select count(*) from venta_items) = 2, 'C solo ve items de sus productos';
end $$;
update notificaciones set leida = true;

-- ===== B: notificaciones y reporte =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002"}';
do $$ begin
  -- B: aprobada + A se unió a pines? (A ya era socio antes que B) => solo aprobada
  assert (select count(*) from notificaciones) = 1, 'B solo tiene aprobada';
  assert (select count(*) from reporte_socio('mes', '2020-01-01', '2100-01-01')) = 1, 'B ve solo pines';
  assert (select count(*) from inventario_socio('2020-01-01', '2100-01-01')) = 1, 'B: inventario solo de pines';
end $$;

-- ===== anon no ve nada =====
reset role;
set local role anon;
do $$ begin
  begin perform 1 from stock_producto; assert false, 'anon stock';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'TODAS LAS PRUEBAS PASARON' as resultado;
rollback;
