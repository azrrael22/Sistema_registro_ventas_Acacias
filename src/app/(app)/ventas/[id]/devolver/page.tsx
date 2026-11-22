import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/server/supabase";
import { fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Monto, Tarjeta, Titulo, claseBoton } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { registrarDevolucion } from "../../actions";

export const metadata: Metadata = { title: "Devolución" };

export default async function DevolverPage({ params }: PageProps<"/ventas/[id]/devolver">) {
  const id = Number((await params).id);
  const supabase = await createClient();
  const [{ data: venta }, { data: devoluciones }] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, fecha, tipo, venta_items(producto_id, cantidad, precio_unitario, productos(nombre))")
      .eq("id", id)
      .eq("tipo", "venta")
      .maybeSingle(),
    supabase.from("ventas").select("venta_items(producto_id, cantidad)").eq("venta_origen_id", id),
  ]);
  if (!venta) notFound();

  const devuelto = new Map<number, number>();
  devoluciones?.flatMap((d) => d.venta_items).forEach((i) => devuelto.set(i.producto_id, (devuelto.get(i.producto_id) ?? 0) + i.cantidad));

  return (
    <>
      <Titulo>Devolución de la venta #{venta.id}</Titulo>
      <Tarjeta>
        <p className="text-sm text-stone-600 dark:text-stone-400">Venta del {fecha(venta.fecha)}. Indica cuántas unidades se devuelven de cada producto.</p>
        <FormAccion accion={registrarDevolucion} className="mt-4 flex flex-col gap-4">
          <input type="hidden" name="venta_id" value={venta.id} />
          <ul className="divide-y divide-stone-100 border-y border-stone-100 dark:divide-stone-700 dark:border-stone-700">
            {venta.venta_items.map((i) => {
              const max = i.cantidad - (devuelto.get(i.producto_id) ?? 0);
              return (
                <li key={i.producto_id}>
                  <label className="flex items-center justify-between gap-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-900 dark:text-stone-50">{i.productos?.nombre}</span>
                      <span className="block text-xs text-stone-500 dark:text-stone-400">
                        <Monto valor={i.precio_unitario} /> · vendidas {i.cantidad} · {max > 0 ? `puedes devolver ${max}` : "ya se devolvieron todas"}
                      </span>
                    </span>
                    <Entrada
                      name={`cantidad_${i.producto_id}`}
                      type="number"
                      min="0"
                      max={max}
                      defaultValue={0}
                      disabled={max <= 0}
                      className="w-20 text-right tabular-nums"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
          <Etiqueta texto="Motivo (opcional)">
            <Entrada name="nota" />
          </Etiqueta>
          <div className="flex gap-2">
            <BotonEnvio>Registrar devolución</BotonEnvio>
            <Link href="/ventas" className={claseBoton("fantasma")}>Cancelar</Link>
          </div>
        </FormAccion>
      </Tarjeta>
    </>
  );
}
