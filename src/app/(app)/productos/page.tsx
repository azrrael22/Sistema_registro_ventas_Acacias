import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { dinero } from "@/lib/formato";
import { Boton, Entrada, Etiqueta, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { actualizarProducto, crearCategoria, crearProducto, salirCategoria, unirseCategoria } from "./actions";

export const metadata: Metadata = { title: "Productos y socios" };

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
      <Titulo>Productos y socios</Titulo>
      <p className="mb-6 text-sm text-stone-600">
        Ser socio de una categoría te hace dueño de todos sus productos: puedes registrar inventario y retirar el dinero
        de sus ventas. Cualquier empleado puede vender cualquier producto.
      </p>

      <div className="flex flex-col gap-4">
        {!categorias?.length && <Vacio>Aún no hay categorías.</Vacio>}
        {categorias?.map((cat) => {
          const sociosCat = socios?.filter((s) => s.categoria_id === cat.id) ?? [];
          const soySocio = sociosCat.some((s) => s.empleado_id === empleado.id);
          const puedeEditar = empleado.es_admin || soySocio;
          return (
            <Tarjeta key={cat.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{cat.nombre}</h2>
                  <p className="text-sm text-stone-600">
                    Socios:{" "}
                    {sociosCat.length ? sociosCat.map((s) => s.empleados?.nombre).join(", ") : <em>ninguno todavía</em>}
                  </p>
                </div>
                <form action={soySocio ? salirCategoria : unirseCategoria}>
                  <input type="hidden" name="categoria_id" value={cat.id} />
                  <Boton variante={soySocio ? "secundario" : "primario"}>
                    {soySocio ? "Dejar de ser socio" : "Ser socio"}
                  </Boton>
                </form>
              </div>

              <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
                {cat.productos.map((p) => (
                  <li key={p.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className={p.activo ? "" : "text-stone-400"}>
                        {p.nombre} {!p.activo && <span className="text-xs">(inactivo)</span>}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-stone-500">Stock: {stockPor.get(p.id) ?? 0}</span>
                        <span className="font-medium">{dinero(p.precio)}</span>
                      </span>
                    </div>
                    {(puedeEditar || p.creado_por === empleado.id) && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs font-medium text-emerald-700">Editar</summary>
                        <FormAccion accion={actualizarProducto} className="mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="id" value={p.id} />
                          <Etiqueta texto="Nombre" className="flex-1">
                            <Entrada name="nombre" defaultValue={p.nombre} required />
                          </Etiqueta>
                          <Etiqueta texto="Precio" className="w-32">
                            <Entrada name="precio" type="number" min="0" step="50" defaultValue={p.precio} required />
                          </Etiqueta>
                          <label className="flex min-h-10 items-center gap-2 text-sm">
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
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-emerald-700">+ Agregar producto</summary>
                  <FormAccion accion={crearProducto} className="mt-2 flex flex-wrap items-end gap-2">
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
          <h2 className="mb-2 font-semibold">Nueva categoría</h2>
          <FormAccion accion={crearCategoria} className="flex flex-wrap items-end gap-2">
            <Etiqueta texto="Nombre" className="flex-1">
              <Entrada name="nombre" required />
            </Etiqueta>
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input type="checkbox" name="ser_socio" defaultChecked className="size-4" /> Ser socio
            </label>
            <BotonEnvio>Crear</BotonEnvio>
          </FormAccion>
        </Tarjeta>
      </div>
    </>
  );
}
