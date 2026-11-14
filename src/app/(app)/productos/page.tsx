import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { Boton, Entrada, Etiqueta, Insignia, Monto, Pestanas, Tarjeta, Titulo, Vacio, cx } from "@/components/ui";
import { IconoFlecha, IconoMas } from "@/components/iconos";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { CampoFoto } from "@/components/campo-foto";
import { FotoProducto } from "@/components/foto-producto";
import { urlFoto } from "@/lib/fotos";
import { actualizarProducto, crearCategoria, crearProducto, salirCategoria, unirseCategoria } from "./actions";

export const metadata: Metadata = { title: "Productos y socios" };

// <summary> sin el triángulo del navegador
const resumen = "inline-flex cursor-pointer list-none items-center gap-2 font-medium transition-colors [&::-webkit-details-marker]:hidden";

// "1 producto", "3 productos"
const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default async function ProductosPage({ searchParams }: PageProps<"/productos">) {
  const empleado = await requerirEmpleadoActivo();
  const { categoria } = await searchParams;
  const supabase = await createClient();
  const [{ data: categorias }, { data: socios }, { data: stock }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre, creado_por, productos(id, nombre, precio, activo, creado_por, foto)")
      .order("nombre")
      .order("nombre", { referencedTable: "productos" }),
    supabase.from("socios").select("categoria_id, empleado_id, empleados(nombre)").eq("activo", true),
    supabase.from("stock_producto").select("producto_id, stock"),
  ]);
  const stockPor = new Map(stock?.map((s) => [s.producto_id, Number(s.stock ?? 0)]));
  const mias = new Set(socios?.filter((s) => s.empleado_id === empleado.id).map((s) => s.categoria_id));
  // "mias" o el id de una categoría; cualquier otro valor muestra todas.
  const filtro = typeof categoria === "string" && (categoria === "mias" || categorias?.some((c) => String(c.id) === categoria)) ? categoria : undefined;
  const visibles = categorias?.filter((c) => !filtro || (filtro === "mias" ? mias.has(c.id) : String(c.id) === filtro)) ?? [];

  return (
    <>
      <Titulo descripcion="Ser socio de una categoría te hace dueño de todos sus productos: puedes registrar inventario y retirar el dinero de sus ventas. Cualquier empleado puede vender cualquier producto.">
        Productos y socios
      </Titulo>
      {!!categorias?.length && (
        <Pestanas
          etiqueta="Categorías que se muestran"
          opciones={[
            { href: "/productos", texto: "Todas", activa: !filtro },
            { href: "/productos?categoria=mias", texto: "Mis categorías", activa: filtro === "mias" },
            ...categorias.map((c) => ({ href: `/productos?categoria=${c.id}`, texto: c.nombre, activa: filtro === String(c.id) })),
          ]}
        />
      )}

      <div className="flex flex-col gap-4">
        {!categorias?.length && <Vacio>Aún no hay categorías</Vacio>}
        {filtro === "mias" && !visibles.length && <Vacio>Aún no eres socio de ninguna categoría</Vacio>}
        {visibles.map((cat) => {
          const sociosCat = socios?.filter((s) => s.categoria_id === cat.id) ?? [];
          const soySocio = mias.has(cat.id);
          const puedeEditar = empleado.es_admin || soySocio;
          const activos = cat.productos.filter((p) => p.activo).length;
          const unidades = cat.productos.reduce((t, p) => t + (stockPor.get(p.id) ?? 0), 0);
          return (
            <Tarjeta key={cat.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 sm:flex-1">
                  <h2 className="flex flex-wrap items-center gap-2 font-medium text-stone-900 dark:text-stone-50">
                    {cat.nombre}
                    {soySocio && <Insignia variante="ok">Eres socio</Insignia>}
                  </h2>
                  <p className="mt-0.5 text-sm text-stone-500 tabular-nums dark:text-stone-400">
                    {cat.productos.length
                      ? `${cuenta(cat.productos.length, "producto", "productos")} · ${cuenta(activos, "activo", "activos")} · ${cuenta(unidades, "unidad", "unidades")} en stock`
                      : "Sin productos"}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                    {sociosCat.length ? (
                      <>
                        Socios:
                        {sociosCat.map((s) => <Insignia key={s.empleado_id}>{s.empleados?.nombre}</Insignia>)}
                      </>
                    ) : (
                      "Sin socios todavía"
                    )}
                  </p>
                </div>
                {/* En celular el botón siempre baja a su propia línea. El fantasma no tiene borde, así que
                    se corre lo que mide su relleno para que el texto quede alineado con el contenido
                    (a la izquierda en celular, con los precios en escritorio). */}
                <form action={soySocio ? salirCategoria : unirseCategoria} className="max-sm:w-full">
                  <input type="hidden" name="categoria_id" value={cat.id} />
                  <Boton variante={soySocio ? "fantasma" : "secundario"} className={soySocio ? "max-sm:-ml-4 sm:-mr-4" : undefined}>
                    {soySocio ? "Dejar de ser socio" : "Ser socio"}
                  </Boton>
                </form>
              </div>

              <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-700 dark:border-stone-700">
                {cat.productos.map((p) => {
                  const disponibles = stockPor.get(p.id) ?? 0;
                  // La misma fila para los productos que se editan y los que no: foto, nombre con su stock y precio
                  const fila = (
                    <>
                      <FotoProducto src={urlFoto(p.foto)} className={p.activo ? undefined : "opacity-60"} />
                      <span className="min-w-0 flex-1">
                        <span className={cx("block", p.activo ? "text-stone-900 dark:text-stone-50" : "text-stone-500 dark:text-stone-400")}>
                          {p.nombre}
                          {!p.activo && <Insignia className="ml-2">Inactivo</Insignia>}
                        </span>
                        {/* Stock bajo en ámbar, como en Inicio, Inventario y Vender (no en los inactivos) */}
                        <span className={cx("block text-xs tabular-nums", p.activo && disponibles <= 3 ? "text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>
                          {disponibles} en stock
                        </span>
                      </span>
                      <Monto valor={p.precio} className="shrink-0 text-stone-900 dark:text-stone-50" />
                    </>
                  );
                  return (
                    <li key={p.id} className="py-2 text-sm">
                      {puedeEditar || p.creado_por === empleado.id ? (
                        <details className="group">
                          {/* Toda la fila abre el formulario. rounded-xl: 8 de la foto + 4 de relleno */}
                          <summary className="-mx-2 flex cursor-pointer list-none items-center gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-emerald-700 dark:hover:bg-stone-700/50 dark:focus-visible:outline-emerald-500 [&::-webkit-details-marker]:hidden">
                            {fila}
                            <IconoFlecha className="text-stone-500 transition-transform group-open:rotate-90 dark:text-stone-400" />
                            <span className="sr-only">Editar</span>
                          </summary>
                          {/* Alineado con la columna del nombre: 40 de la foto + 12 de separación */}
                          <FormAccion accion={actualizarProducto} className="mt-3 mb-2 flex flex-wrap items-end gap-2 sm:pl-13">
                            <input type="hidden" name="id" value={p.id} />
                            <Etiqueta texto="Nombre" className="flex-1">
                              <Entrada name="nombre" defaultValue={p.nombre} required />
                            </Etiqueta>
                            <Etiqueta texto="Precio" className="w-32">
                              <Entrada name="precio" type="number" min="0" step="50" defaultValue={p.precio} required />
                            </Etiqueta>
                            <CampoFoto texto="Cambiar foto" actual={urlFoto(p.foto)} className="min-w-64 flex-1" />
                            <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                              <input type="checkbox" name="activo" defaultChecked={p.activo} className="size-4" /> Activo
                            </label>
                            <BotonEnvio variante="secundario">Guardar</BotonEnvio>
                          </FormAccion>
                        </details>
                      ) : (
                        <div className="flex items-center gap-3 py-1">
                          {fila}
                          {/* Mismo ancho que la flecha, para que los precios queden en una columna */}
                          <span className="size-4.5 shrink-0" aria-hidden />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {puedeEditar && (
                <details className="mt-3">
                  <summary className={`${resumen} text-sm text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50`}>
                    <IconoMas /> Agregar producto
                  </summary>
                  <FormAccion accion={crearProducto} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="categoria_id" value={cat.id} />
                    <Etiqueta texto="Nombre" className="flex-1">
                      <Entrada name="nombre" required />
                    </Etiqueta>
                    <Etiqueta texto="Precio" className="w-32">
                      <Entrada name="precio" type="number" min="50" step="50" required />
                    </Etiqueta>
                    <CampoFoto requerida className="min-w-64 flex-1" />
                    <BotonEnvio>Agregar</BotonEnvio>
                  </FormAccion>
                </details>
              )}
            </Tarjeta>
          );
        })}

        <Tarjeta>
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Nueva categoría</h2>
          <FormAccion accion={crearCategoria} className="flex flex-wrap items-end gap-2">
            <Etiqueta texto="Nombre" className="flex-1">
              <Entrada name="nombre" required />
            </Etiqueta>
            <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <input type="checkbox" name="ser_socio" defaultChecked className="size-4" /> Ser socio
            </label>
            <BotonEnvio>Crear</BotonEnvio>
          </FormAccion>
        </Tarjeta>
      </div>
    </>
  );
}
