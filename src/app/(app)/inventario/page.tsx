import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Selector, Tarjeta, Titulo, Vacio, cx } from "@/components/ui";
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
  const stockPor = new Map(stock?.map((s) => [s.producto_id, Number(s.stock ?? 0)]));

  return (
    <>
      <Titulo>Inventario</Titulo>
      {!productos.length ? (
        <Vacio>Solo los socios manejan inventario. Hazte socio de una categoría en “Productos y socios”.</Vacio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta>
            <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-50">Registrar movimiento</h2>
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
                  <option value="conteo">Conteo físico (escribe cuántas hay)</option>
                  <option value="ajuste">Ajuste manual (+ o −)</option>
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
            <h2 className="mb-2 font-medium text-stone-900 dark:text-stone-50">Stock actual</h2>
            <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
              {productos.map((p) => {
                const disponibles = stockPor.get(p.id) ?? 0;
                return (
                  <li key={p.id} className="flex justify-between gap-4 py-2.5">
                    <span className="text-stone-900 dark:text-stone-50">{p.nombre} <span className="text-stone-500 dark:text-stone-400">· {p.categorias?.nombre}</span></span>
                    <span className={cx("font-medium tabular-nums", disponibles <= 3 ? "text-amber-700 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")}>{disponibles}</span>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>

          <Tarjeta className="md:col-span-2">
            <h2 className="mb-2 font-medium text-stone-900 dark:text-stone-50">Últimos movimientos</h2>
            {!movimientos?.length ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sin movimientos todavía</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
                {movimientos.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="text-stone-900 dark:text-stone-50">
                      <span className="font-medium tabular-nums">{m.cantidad > 0 ? "+" : "−"}{Math.abs(m.cantidad)}</span> {m.productos?.nombre}
                      {/* Un ajuste que resta es una pérdida: así aparece en los reportes */}
                      <span className="text-stone-500 dark:text-stone-400"> · {m.tipo === "entrada" ? "Entrada" : m.cantidad < 0 ? "Pérdida" : "Ajuste"} · {m.empleados?.nombre}{m.nota ? ` · ${m.nota}` : ""}</span>
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">{fecha(m.fecha)}</span>
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
