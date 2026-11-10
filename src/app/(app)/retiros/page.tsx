import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requerirEmpleadoActivo } from "@/lib/sesion";
import { misProductos } from "@/lib/consultas";
import { dinero, fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
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
            <h2 className="mb-3 font-semibold">Registrar retiro</h2>
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
            <h2 className="mb-1 font-semibold">Saldo disponible</h2>
            <p className="mb-3 text-2xl font-semibold tabular-nums">{dinero(total)}</p>
            <ul className="divide-y divide-stone-100 text-sm">
              {productos.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{p.nombre} <span className="text-stone-500">· {p.categorias?.nombre}</span></span>
                  <span className="font-medium tabular-nums">{dinero(saldoPor.get(p.id))}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="md:col-span-2">
            <h2 className="mb-3 font-semibold">Últimos retiros</h2>
            {!retiros?.length ? (
              <p className="text-sm text-stone-500">Sin retiros todavía.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {retiros.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{dinero(r.monto)}</span> de {r.productos?.nombre}
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
