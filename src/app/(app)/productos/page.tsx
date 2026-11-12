import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { Boton, Entrada, Etiqueta, Monto, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { IconoFlecha, IconoMas } from "@/components/iconos";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
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
      .select("id, nombre, creado_por, productos(id, nombre, precio, activo, creado_por)")
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
                  <h2 className="font-medium text-stone-900">{cat.nombre}</h2>
                  <p className="mt-0.5 text-sm text-stone-500">
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

              <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
                {cat.productos.map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                      <span className={p.activo ? "text-stone-900" : "text-stone-400"}>
                        {p.nombre}
                        {!p.activo && <span className="ml-2 rounded-md bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">Inactivo</span>}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-stone-500 tabular-nums">{stockPor.get(p.id) ?? 0} en stock</span>
                        <Monto valor={p.precio} className="min-w-20 text-right text-stone-900" />
                      </span>
                    </div>
                    {(puedeEditar || p.creado_por === empleado.id) && (
                      <details className="group mt-1">
                        <summary className={`${resumen} text-sm text-stone-500 hover:text-stone-900`}>
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
                          <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700">
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
                  <summary className={`${resumen} text-sm text-stone-700 hover:text-stone-900`}>
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
                    <BotonEnvio>Agregar</BotonEnvio>
                  </FormAccion>
                </details>
              )}
            </Tarjeta>
          );
        })}

        <Tarjeta>
          <h2 className="mb-3 font-medium text-stone-900">Nueva categoría</h2>
          <FormAccion accion={crearCategoria} className="flex flex-wrap items-end gap-2">
            <Etiqueta texto="Nombre" className="flex-1">
              <Entrada name="nombre" required />
            </Etiqueta>
            <label className="flex min-h-10 items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="ser_socio" defaultChecked className="size-4" /> Ser socio
            </label>
            <BotonEnvio>Crear</BotonEnvio>
          </FormAccion>
        </Tarjeta>
      </div>
    </>
  );
}
