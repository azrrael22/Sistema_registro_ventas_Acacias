import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/server/supabase";
import { dinero, fecha } from "@/lib/formato";
import { Entrada, Etiqueta, Tarjeta, Titulo } from "@/components/ui";
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
        <p className="mb-4 text-sm text-stone-600">Venta del {fecha(venta.fecha)}. Indica cuántas unidades se devuelven de cada producto.</p>
        <FormAccion accion={registrarDevolucion} className="flex flex-col gap-3">
          <input type="hidden" name="venta_id" value={venta.id} />
          {venta.venta_items.map((i) => {
            const max = i.cantidad - (devuelto.get(i.producto_id) ?? 0);
            return (
              <Etiqueta key={i.producto_id} texto={`${i.productos?.nombre} · ${dinero(i.precio_unitario)} (vendidas ${i.cantidad}, puedes devolver ${max})`}>
                <Entrada name={`cantidad_${i.producto_id}`} type="number" min="0" max={max} defaultValue={0} disabled={max <= 0} />
              </Etiqueta>
            );
          })}
          <Etiqueta texto="Motivo (opcional)">
            <Entrada name="nota" />
          </Etiqueta>
          <div className="flex gap-2">
            <BotonEnvio variante="peligro">Registrar devolución</BotonEnvio>
            <Link href="/ventas" className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm text-stone-700 hover:bg-stone-100">Cancelar</Link>
          </div>
        </FormAccion>
      </Tarjeta>
    </>
  );
}
