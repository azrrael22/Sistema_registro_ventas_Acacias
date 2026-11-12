import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { dinero, fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Monto, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { registrarRetiro } from "./actions";

export const metadata: Metadata = { title: "Retiros" };

export default async function RetirosPage() {
  const empleado = await requerirEmpleadoActivo();
  const productos = await misProductos(empleado.id);
  const ids = productos.map((p) => p.id);
  const supabase = await createClient();
  const [{ data: saldos }, { data: retiros }] = await Promise.all([
    supabase.from("saldo_producto").select("producto_id, saldo").in("producto_id", ids),
    supabase
      .from("retiros")
      .select("id, monto, fecha, nota, empleado_id, productos(nombre), empleados(nombre)")
      .in("producto_id", ids)
      .order("fecha", { ascending: false })
      .limit(30),
  ]);
  const saldoPor = new Map(saldos?.map((s) => [s.producto_id, Number(s.saldo ?? 0)]));
  const total = [...saldoPor.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <Titulo>Retiros de dinero</Titulo>
      {!productos.length ? (
        <Vacio>Solo los socios pueden retirar dinero. Hazte socio de una categoría en “Productos y socios”.</Vacio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta>
            <h2 className="mb-4 font-medium text-stone-900">Registrar retiro</h2>
            <FormAccion accion={registrarRetiro} className="flex flex-col gap-3">
              <Etiqueta texto="Producto">
                <Selector name="producto_id" required>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · disponible {dinero(saldoPor.get(p.id))}
                    </option>
                  ))}
                </Selector>
              </Etiqueta>
              <Etiqueta texto="Monto">
                <Entrada name="monto" type="number" min="1" step="any" required />
              </Etiqueta>
              <Etiqueta texto="Nota (opcional)">
                <Entrada name="nota" />
              </Etiqueta>
              <BotonEnvio>Registrar retiro</BotonEnvio>
            </FormAccion>
          </Tarjeta>

          <Tarjeta>
            <h2 className="text-sm text-stone-500">Saldo disponible</h2>
            <Monto valor={total} className="mt-1 block text-3xl font-medium text-stone-900" />
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100 text-sm">
              {productos.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 py-2.5">
                  <span className="text-stone-900">{p.nombre} <span className="text-stone-500">· {p.categorias?.nombre}</span></span>
                  <Monto valor={saldoPor.get(p.id)} className="text-stone-900" />
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="md:col-span-2">
            <h2 className="mb-2 font-medium text-stone-900">Últimos retiros</h2>
            {!retiros?.length ? (
              <p className="text-sm text-stone-500">Sin retiros todavía</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {retiros.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="text-stone-900">
                      <Monto valor={r.monto} className="font-medium" /> de {r.productos?.nombre}
                      <span className="text-stone-500"> · {r.empleado_id === empleado.id ? "tú" : r.empleados?.nombre}{r.nota ? ` · ${r.nota}` : ""}</span>
                    </span>
                    <span className="text-stone-500">{fecha(r.fecha)}</span>
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
