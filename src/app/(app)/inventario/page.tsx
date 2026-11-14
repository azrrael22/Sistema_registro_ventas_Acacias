import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { horaDe, porDia, tituloDia } from "@/lib/formato";
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
        // items-start: cada tarjeta con su altura, sin franja vacía al fondo de la más corta
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <Tarjeta>
            <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-50">Registrar movimiento</h2>
            <FormAccion accion={registrarMovimiento} className="group/mov flex flex-col gap-3">
              <Etiqueta texto="Producto">
                <Selector name="producto_id" required>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.categorias?.nombre} · {p.nombre}</option>
                  ))}
                </Selector>
              </Etiqueta>
              <Etiqueta texto="Tipo">
                <Selector name="tipo">
                  <option value="entrada">Entrada de mercancía</option>
                  <option value="conteo">Conteo físico</option>
                  <option value="ajuste">Ajuste manual</option>
                </Selector>
              </Etiqueta>
              <Etiqueta texto="Cantidad">
                <Entrada name="cantidad" type="number" step="1" required aria-describedby="pista-cantidad" />
              </Etiqueta>
              {/* La pista cambia con el tipo elegido, solo con CSS (:has). Fuera de la etiqueta para no
                  sumarse al nombre del campo; -mt-2 la deja a 4 px, como el espacio entre etiqueta y campo. */}
              <p id="pista-cantidad" className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
                <span className="hidden group-has-[option[value=entrada]:checked]/mov:inline">Unidades que llegaron</span>
                <span className="hidden group-has-[option[value=conteo]:checked]/mov:inline">Cuántas unidades hay ahora; se registra la diferencia</span>
                <span className="hidden group-has-[option[value=ajuste]:checked]/mov:inline">Positivo suma; negativo resta y cuenta como pérdida</span>
              </p>
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
            <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Últimos movimientos</h2>
            {!movimientos?.length ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sin movimientos todavía</p>
            ) : (
              // Por día, como en Ventas: la fecha va en el encabezado y cada fila lleva la hora
              <div className="flex flex-col gap-4">
                {porDia(movimientos).map(([dia, delDia]) => (
                  <div key={dia}>
                    <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">{tituloDia(dia)}</h3>
                    <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
                      {delDia.map((m) => {
                        // Un ajuste que resta es una pérdida: así aparece en los reportes
                        const perdida = m.tipo !== "entrada" && m.cantidad < 0;
                        return (
                          <li key={m.id} className="flex items-baseline gap-3 py-2.5">
                            {/* Las cantidades con signo en una columna alineada a la derecha */}
                            <span className={cx("w-10 shrink-0 text-right font-medium tabular-nums", perdida ? "text-amber-700 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")}>
                              {m.cantidad > 0 ? "+" : "−"}
                              {Math.abs(m.cantidad)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-stone-900 dark:text-stone-50">{m.productos?.nombre}</span>
                              <span className="block text-xs text-stone-500 dark:text-stone-400">
                                {m.tipo === "entrada" ? "Entrada" : perdida ? "Pérdida" : "Ajuste"} · {m.empleados?.nombre}
                                {m.nota && <> · “{m.nota}”</>}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs text-stone-500 tabular-nums dark:text-stone-400">{horaDe(m.fecha)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Tarjeta>
        </div>
      )}
    </>
  );
}
