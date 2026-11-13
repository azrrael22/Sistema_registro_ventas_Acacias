import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { fecha } from "@/lib/formato";
import { Monto, Pestanas, Tarjeta, Titulo, Vacio, claseBoton, cx } from "@/components/ui";
import { IconoMas } from "@/components/iconos";

export const metadata: Metadata = { title: "Ventas" };

export default async function VentasPage({ searchParams }: PageProps<"/ventas">) {
  const empleado = await requerirEmpleadoActivo();
  const { ver } = await searchParams;
  // "todas" es solo para admin; cualquier otro valor muestra "Mis ventas".
  const vista = ver === "categorias" || (ver === "todas" && empleado.es_admin) ? ver : undefined;
  const supabase = await createClient();

  // Filtro explícito: la RLS deja ver todas las ventas a un admin.
  // Con !inner solo llegan las ventas con ítems que pasan el filtro, y solo esos ítems.
  let consulta = supabase
    .from("ventas")
    .select("id, tipo, fecha, nota, empleado_id, venta_origen_id, empleados(nombre), venta_items!inner(id, cantidad, precio_unitario, productos(nombre))")
    .order("fecha", { ascending: false })
    .limit(100);
  const ids = vista === "categorias" ? (await misProductos(empleado.id)).map((p) => p.id) : [];
  if (!vista) consulta = consulta.eq("empleado_id", empleado.id);
  if (vista === "categorias") consulta = consulta.in("venta_items.producto_id", ids);
  const { data: ventas } = vista === "categorias" && !ids.length ? { data: [] } : await consulta;

  return (
    <>
      <Titulo
        accion={
          <Link href="/ventas/nueva" className={claseBoton("primario")}>
            <IconoMas /> Nueva venta
          </Link>
        }
      >
        Ventas
      </Titulo>
      <Pestanas
        etiqueta="Ventas que se muestran"
        opciones={[
          { href: "/ventas", texto: "Mis ventas", activa: !vista },
          { href: "/ventas?ver=categorias", texto: "Mis categorías", activa: vista === "categorias" },
          ...(empleado.es_admin ? [{ href: "/ventas?ver=todas", texto: "Todas", activa: vista === "todas" }] : []),
        ]}
      />

      {!ventas?.length ? (
        <Vacio>{vista === "categorias" && !ids.length ? "Aún no eres socio de ninguna categoría" : "No hay ventas registradas"}</Vacio>
      ) : (
        <Tarjeta className="p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {ventas.map((v) => {
              const total = v.venta_items.reduce((t, i) => t + i.cantidad * Number(i.precio_unitario), 0);
              const esDevolucion = v.tipo === "devolucion";
              return (
                <li key={v.id} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900 dark:text-stone-50">
                      <span>
                        {esDevolucion ? "Devolución" : "Venta"} #{v.id}
                        {v.venta_origen_id && <span className="font-normal text-stone-500 dark:text-stone-400"> de #{v.venta_origen_id}</span>}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                      {fecha(v.fecha)} · {v.empleado_id === empleado.id ? "tú" : v.empleados?.nombre}
                    </p>
                    <ul className="mt-2 text-sm text-stone-700 dark:text-stone-300">
                      {v.venta_items.map((i) => (
                        <li key={i.id}>
                          {i.cantidad} × {i.productos?.nombre}{" "}
                          <span className="text-stone-500 dark:text-stone-400">
                            (<Monto valor={i.precio_unitario} />)
                          </span>
                        </li>
                      ))}
                    </ul>
                    {v.nota && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">“{v.nota}”</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Monto valor={esDevolucion ? -total : total} className={cx("font-medium", esDevolucion ? "text-amber-800 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")} />
                    {!esDevolucion && (
                      <Link href={`/ventas/${v.id}/devolver`} className="text-xs text-stone-500 transition-colors hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-50">
                        Registrar devolución
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
