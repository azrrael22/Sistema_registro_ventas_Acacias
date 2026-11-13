import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misCategorias } from "@/server/consultas";
import { dinero, fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Monto, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { registrarRetiro } from "./actions";

export const metadata: Metadata = { title: "Retiros" };

export default async function RetirosPage() {
  const empleado = await requerirEmpleadoActivo();
  const ids = await misCategorias(empleado.id);
  const supabase = await createClient();
  const [{ data: saldos }, { data: retiros }] = await Promise.all([
    supabase.from("saldo_categoria").select("categoria_id, nombre, saldo").in("categoria_id", ids).order("nombre"),
    supabase
      .from("retiros")
      .select("id, monto, fecha, nota, empleado_id, categorias(nombre), empleados(nombre)")
      .in("categoria_id", ids)
      .order("fecha", { ascending: false })
      .limit(30),
  ]);
  const categorias = saldos?.map((s) => ({ id: s.categoria_id!, nombre: s.nombre, saldo: Number(s.saldo ?? 0) })) ?? [];
  const total = categorias.reduce((t, c) => t + c.saldo, 0);

  return (
    <>
      <Titulo>Retiros de dinero</Titulo>
      {!categorias.length ? (
        <Vacio>Solo los socios pueden retirar dinero. Hazte socio de una categoría en “Productos y socios”.</Vacio>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Tarjeta>
            <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-50">Registrar retiro</h2>
            <FormAccion accion={registrarRetiro} className="flex flex-col gap-3">
              <Etiqueta texto="Categoría">
                <Selector name="categoria_id" required>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} · disponible {dinero(c.saldo)}
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
            <h2 className="text-sm text-stone-500 dark:text-stone-400">Saldo disponible</h2>
            <Monto valor={total} className="mt-1 block text-3xl font-medium text-stone-900 dark:text-stone-50" />
            <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100 text-sm dark:divide-stone-700 dark:border-stone-700">
              {categorias.map((c) => (
                <li key={c.id} className="flex justify-between gap-4 py-2.5">
                  <span className="text-stone-900 dark:text-stone-50">{c.nombre}</span>
                  <Monto valor={c.saldo} className="text-stone-900 dark:text-stone-50" />
                </li>
              ))}
            </ul>
          </Tarjeta>

          <Tarjeta className="md:col-span-2">
            <h2 className="mb-2 font-medium text-stone-900 dark:text-stone-50">Últimos retiros</h2>
            {!retiros?.length ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Sin retiros todavía</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
                {retiros.map((r) => (
                  <li key={r.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5">
                    <span className="text-stone-900 dark:text-stone-50">
                      <Monto valor={r.monto} className="font-medium" /> de {r.categorias?.nombre}
                      <span className="text-stone-500 dark:text-stone-400"> · {r.empleado_id === empleado.id ? "tú" : r.empleados?.nombre}{r.nota ? ` · ${r.nota}` : ""}</span>
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">{fecha(r.fecha)}</span>
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
