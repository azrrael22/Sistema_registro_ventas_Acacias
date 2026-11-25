import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { Titulo, Vacio } from "@/components/ui";
import { Carrito } from "./carrito";
import { productosEnVenta } from "./venta";

export const metadata: Metadata = { title: "Vender" };

export default async function NuevaVentaPage() {
  // Ya lo consultó el layout (getEmpleado está cacheado por request): la venta guardada en el
  // celular es de este empleado
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const [{ data: productos }, { data: stock }] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio, foto, maneja_inventario, categorias(nombre)")
      .eq("activo", true)
      .order("nombre")
      .throwOnError(),
    supabase.from("stock_producto").select("producto_id, stock").throwOnError(),
  ]);
  const lista = productosEnVenta(productos, stock);

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
