import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirEmpleadoActivo } from "@/lib/sesion";
import { misProductos } from "@/lib/consultas";
import { fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { registrarMovimiento } from "./actions";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const empleado = await requerirEmpleadoActivo();
  const productos = await misProductos(empleado.id);
  const ids = productos.map((p) => p.id);
  const supabase = await createClient();
  const [{ data: stock }, { data: movimientos }] = await Promise.all([
    supabase.from("stock_producto").select("producto_id, stock").in("producto_id", ids),
    supabase
      .from("inventario_movimientos")
      .select("id, tipo, cantidad, fecha, nota, productos(nombre), empleados(nombre)")
      .in("producto_id", ids)
      .order("fecha", { ascending: false })
      .limit(30),
  ]);
  const stockPor = new Map(stock?.map((s) => [s.producto_id, s.stock]));

  return (
    <>
      <Titulo>Inventario</Titulo>
      {!productos.length ? (
        <Vacio>Solo los socios manejan inventario. Hazte socio de una categoría en “Productos y socios”.</Vacio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta>
            <h2 className="mb-3 font-semibold">Registrar movimiento</h2>
            <FormAccion accion={registrarMovimiento} className="flex flex-col gap-3">
              <Etiqueta texto="Producto">
                <Selector name="producto_id" required>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.categorias?.nombre} · {p.nombre}</option>
                  ))}
                </Selector>
              </Etiqueta>
              <Etiqueta texto="Tipo">
                <Selector name="tipo">
                  <option value="entrada">Entrada de mercancía (+)</option>
                  <option value="ajuste">Ajuste (+ o −, p. ej. pérdida o conteo)</option>
                </Selector>
              </Etiqueta>
              <Etiqueta texto="Cantidad">
                <Entrada name="cantidad" type="number" step="1" required />
              </Etiqueta>
              <Etiqueta texto="Nota (opcional)">
                <Entrada name="nota" />
              </Etiqueta>
              <BotonEnvio>Registrar</BotonEnvio>
            </FormAccion>
          </Tarjeta>

          <Tarjeta>
            <h2 className="mb-3 font-semibold">Stock actual</h2>
            <ul className="divide-y divide-stone-100 text-sm">
              {productos.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{p.nombre} <span className="text-stone-500">· {p.categorias?.nombre}</span></span>
                  <span className="font-semibold tabular-nums">{stockPor.get(p.id) ?? 0}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="md:col-span-2">
            <h2 className="mb-3 font-semibold">Últimos movimientos</h2>
            {!movimientos?.length ? (
              <p className="text-sm text-stone-500">Sin movimientos todavía.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {movimientos.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{m.cantidad > 0 ? "+" : ""}{m.cantidad}</span> {m.productos?.nombre}
                      <span className="text-stone-500"> · {m.tipo} · {m.empleados?.nombre}{m.nota ? ` · ${m.nota}` : ""}</span>
                    </span>
                    <span className="text-stone-500">{fecha(m.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
