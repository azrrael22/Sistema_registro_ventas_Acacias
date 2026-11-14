import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { ayer, diaDe, fechaCorta, horaDe, hoy } from "@/lib/formato";
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
    .select("id, tipo, fecha, nota, empleado_id, venta_origen_id, empleados(nombre), venta_items!inner(id, cantidad, precio_unitario, precio_lista, productos(nombre))")
    .order("fecha", { ascending: false })
    .limit(100);
  const ids = vista === "categorias" ? (await misProductos(empleado.id)).map((p) => p.id) : [];
  if (!vista) consulta = consulta.eq("empleado_id", empleado.id);
  if (vista === "categorias") consulta = consulta.in("venta_items.producto_id", ids);
  const { data: ventas } = vista === "categorias" && !ids.length ? { data: [] } : await consulta;

  // Agrupadas por día, de la más reciente a la más antigua. Sin total diario: con el
  // límite de 100 ventas, el día más antiguo de la lista puede llegar incompleto.
  type Venta = NonNullable<typeof ventas>[number];
  const dias = new Map<string, Venta[]>();
  for (const v of ventas ?? []) {
    const dia = diaDe(v.fecha);
    const delDia = dias.get(dia);
    if (delDia) delDia.push(v);
    else dias.set(dia, [v]);
  }
  const hoyDia = hoy();
  const ayerDia = ayer();
  const tituloDia = (dia: string) =>
    dia === hoyDia ? `Hoy · ${fechaCorta(dia)}` : dia === ayerDia ? `Ayer · ${fechaCorta(dia)}` : fechaCorta(dia);

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
        <div className="flex flex-col gap-6">
          {[...dias].map(([dia, delDia]) => (
            <div key={dia}>
              <h2 className="mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">{tituloDia(dia)}</h2>
              <Tarjeta className="p-0">
                <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                  {delDia.map((v) => {
                    const esDevolucion = v.tipo === "devolucion";
                    // En una devolución las líneas y el total salen en negativo, como en una nota crédito
                    const signo = esDevolucion ? -1 : 1;
                    const total = v.venta_items.reduce((t, i) => t + i.cantidad * Number(i.precio_unitario), 0);
                    return (
                      <li key={v.id} className="px-4 py-4 sm:px-5">
                        {/* Mismo ancho que el tiquete: la acción queda sobre el total y no al otro lado de la tarjeta */}
                        <div className="flex items-start justify-between gap-4 sm:max-w-sm">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                              {esDevolucion ? "Devolución" : "Venta"} #{v.id}
                              {v.venta_origen_id && <span className="font-normal text-stone-500 dark:text-stone-400"> de #{v.venta_origen_id}</span>}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              {horaDe(v.fecha)} · {v.empleado_id === empleado.id ? "tú" : v.empleados?.nombre}
                            </p>
                          </div>
                          {!esDevolucion && (
                            <Link
                              href={`/ventas/${v.id}/devolver`}
                              className="-my-2 -mr-2 shrink-0 rounded-md p-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-50 dark:focus-visible:outline-emerald-500"
                            >
                              Registrar devolución
                            </Link>
                          )}
                        </div>

                        {/* Cada venta se lee como su tiquete: líneas, línea punteada y total */}
                        <div className="mt-3 sm:max-w-sm">
                          <ul className="flex flex-col gap-1 text-sm">
                            {v.venta_items.map((i) => (
                              <li key={i.id} className="flex justify-between gap-4">
                                <span className="min-w-0 text-stone-700 dark:text-stone-300">
                                  {i.cantidad} × {i.productos?.nombre}
                                </span>
                                <span className="shrink-0 text-stone-900 dark:text-stone-50">
                                  {Number(i.precio_lista) > Number(i.precio_unitario) && (
                                    <>
                                      <s className="text-stone-500 dark:text-stone-400">
                                        <span className="sr-only">antes </span>
                                        <Monto valor={signo * i.cantidad * Number(i.precio_lista)} />
                                      </s>{" "}
                                    </>
                                  )}
                                  <Monto valor={signo * i.cantidad * Number(i.precio_unitario)} />
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 flex items-baseline justify-between border-t border-dashed border-stone-300 pt-2 dark:border-stone-600">
                            <span className="text-sm text-stone-600 dark:text-stone-400">Total</span>
                            <Monto
                              valor={signo * total}
                              className={cx("font-medium", esDevolucion ? "text-amber-800 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")}
                            />
                          </div>
                          {v.nota && <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">“{v.nota}”</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
