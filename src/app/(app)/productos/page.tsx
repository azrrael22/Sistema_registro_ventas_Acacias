import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { Boton, Entrada, Etiqueta, Insignia, Monto, Tarjeta, Titulo, Vacio } from "@/components/ui";
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

export default async function ProductosPage() {
  const empleado = await requerirEmpleadoActivo();
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
  const stockPor = new Map(stock?.map((s) => [s.producto_id, s.stock]));

  return (
    <>
      <Titulo descripcion="Ser socio de una categoría te hace dueño de todos sus productos: puedes registrar inventario y retirar el dinero de sus ventas. Cualquier empleado puede vender cualquier producto.">
        Productos y socios
      </Titulo>

      <div className="flex flex-col gap-4">
        {!categorias?.length && <Vacio>Aún no hay categorías</Vacio>}
        {categorias?.map((cat) => {
          const sociosCat = socios?.filter((s) => s.categoria_id === cat.id) ?? [];
          const soySocio = sociosCat.some((s) => s.empleado_id === empleado.id);
          const puedeEditar = empleado.es_admin || soySocio;
          return (
            <Tarjeta key={cat.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-stone-900 dark:text-stone-50">{cat.nombre}</h2>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {sociosCat.length ? `Socios: ${sociosCat.map((s) => s.empleados?.nombre).join(", ")}` : "Sin socios todavía"}
                  </p>
                </div>
                <form action={soySocio ? salirCategoria : unirseCategoria}>
                  <input type="hidden" name="categoria_id" value={cat.id} />
                  <Boton variante={soySocio ? "fantasma" : "secundario"}>
                    {soySocio ? "Dejar de ser socio" : "Ser socio"}
                  </Boton>
                </form>
              </div>

              <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-700 dark:border-stone-700">
                {cat.productos.map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                      <span className={`flex items-center gap-3 ${p.activo ? "text-stone-900 dark:text-stone-50" : "text-stone-500 dark:text-stone-400"}`}>
                        <FotoProducto src={urlFoto(p.foto)} className={p.activo ? undefined : "opacity-60"} />
                        <span>
                          {p.nombre}
                          {!p.activo && <Insignia className="ml-2">Inactivo</Insignia>}
                        </span>
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-stone-500 tabular-nums dark:text-stone-400">{stockPor.get(p.id) ?? 0} en stock</span>
                        <Monto valor={p.precio} className="min-w-20 text-right text-stone-900 dark:text-stone-50" />
                      </span>
                    </div>
                    {(puedeEditar || p.creado_por === empleado.id) && (
                      <details className="group mt-1">
                        <summary className={`${resumen} text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50`}>
                          <IconoFlecha className="transition-transform group-open:rotate-90" /> Editar
                        </summary>
                        <FormAccion accion={actualizarProducto} className="mt-3 flex flex-wrap items-end gap-2">
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
                    )}
                  </li>
                ))}
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
