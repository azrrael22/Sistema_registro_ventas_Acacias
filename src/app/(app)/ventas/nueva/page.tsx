import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { Titulo, Vacio } from "@/components/ui";
import { urlFoto } from "@/lib/fotos";
import { Carrito } from "./carrito";

export const metadata: Metadata = { title: "Vender" };

export default async function NuevaVentaPage() {
  // Ya lo consultó el layout (getEmpleado está cacheado por request): la venta guardada en el
  // celular es de este empleado
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const [{ data: productos }, { data: stock }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio, foto, categorias(nombre)")
      .eq("activo", true)
      .order("nombre")
      .throwOnError(),
    supabase.from("stock_producto").select("producto_id, stock").throwOnError(),
  ]);
  const stockPor = new Map(stock?.map((s) => [s.producto_id, Number(s.stock ?? 0)]));
  const lista = (productos ?? [])
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: Number(p.precio),
      foto: urlFoto(p.foto),
      categoria: p.categorias?.nombre ?? "",
      stock: stockPor.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));

  return (
    <>
      <Titulo>Registrar venta</Titulo>
      {lista.length ? (
        <Carrito productos={lista} empleadoId={empleado.id} />
      ) : (
        <Vacio>No hay productos activos. Un socio debe asignarles precio y activarlos en “Productos y socios”.</Vacio>
      )}
    </>
  );
}
