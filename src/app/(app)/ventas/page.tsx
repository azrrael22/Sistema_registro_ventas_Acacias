import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requerirEmpleadoActivo } from "@/lib/sesion";
import { dinero, fecha } from "@/lib/formato";
import { Tarjeta, Titulo, Vacio, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Ventas" };

export default async function VentasPage({ searchParams }: PageProps<"/ventas">) {
  const empleado = await requerirEmpleadoActivo();
  const { ver } = await searchParams;
  const soloMias = ver !== "todas";
  const supabase = await createClient();

  let consulta = supabase
    .from("ventas")
    .select("id, tipo, fecha, nota, empleado_id, venta_origen_id, empleados(nombre), venta_items(id, cantidad, precio_unitario, productos(nombre))")
    .order("fecha", { ascending: false })
    .limit(100);
  if (soloMias) consulta = consulta.eq("empleado_id", empleado.id);
  const { data: ventas } = await consulta;

  return (
    <>
      <Titulo accion={<Link href="/ventas/nueva" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">+ Nueva venta</Link>}>
        Ventas
      </Titulo>
      <div className="mb-4 flex gap-1 text-sm">
        {[
          { v: undefined, t: "Mis ventas" },
          { v: "todas", t: "Mías y de mis productos" },
        ].map((o) => (
          <Link
            key={o.t}
            href={o.v ? `/ventas?ver=${o.v}` : "/ventas"}
            className={cx("rounded-lg px-3 py-2 font-medium", (o.v === "todas") !== soloMias ? "bg-stone-200 text-stone-900" : "text-stone-600 hover:bg-stone-100")}
          >
            {o.t}
          </Link>
        ))}
      </div>

      {!ventas?.length && <Vacio>No hay ventas registradas.</Vacio>}
      <ul className="flex flex-col gap-3">
        {ventas?.map((v) => {
          const total = v.venta_items.reduce((t, i) => t + i.cantidad * Number(i.precio_unitario), 0);
          const esDevolucion = v.tipo === "devolucion";
          return (
            <li key={v.id}>
              <Tarjeta className={esDevolucion ? "border-amber-200 bg-amber-50/50" : undefined}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {esDevolucion ? "Devolución" : "Venta"} #{v.id}
                      {v.venta_origen_id && <span className="text-stone-500"> de la venta #{v.venta_origen_id}</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {fecha(v.fecha)} · {v.empleado_id === empleado.id ? "tú" : v.empleados?.nombre}
                    </p>
                  </div>
                  <p className={cx("font-semibold tabular-nums", esDevolucion && "text-amber-800")}>
                    {esDevolucion ? "−" : ""}{dinero(total)}
                  </p>
                </div>
                <ul className="mt-2 text-sm text-stone-700">
                  {v.venta_items.map((i) => (
                    <li key={i.id}>
                      {i.cantidad} × {i.productos?.nombre} <span className="text-stone-500">({dinero(i.precio_unitario)})</span>
                    </li>
                  ))}
                </ul>
                {v.venta_items.length === 0 && (
                  <p className="mt-2 text-sm text-stone-500">Sin productos de tus categorías.</p>
                )}
                {v.nota && <p className="mt-1 text-sm text-stone-500 italic">“{v.nota}”</p>}
                {!esDevolucion && (
                  <Link href={`/ventas/${v.id}/devolver`} className="mt-2 inline-block text-sm font-medium text-amber-800 hover:underline">
                    Registrar devolución
                  </Link>
                )}
              </Tarjeta>
            </li>
          );
        })}
      </ul>
    </>
  );
}
