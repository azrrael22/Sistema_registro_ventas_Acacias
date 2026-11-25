import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { Titulo } from "@/components/ui";
import { VistaInventario } from "./vista-inventario";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const empleado = await requerirEmpleadoActivo();
  const mios = await misProductos(empleado.id);
  // Los productos que no llevan inventario no tienen stock ni movimientos
  const productos = mios.filter((p) => p.maneja_inventario);
  const ids = productos.map((p) => p.id);
  const supabase = await createClient();
  const [{ data: stock }, { data: movimientos }] = await Promise.all([
    supabase.from("stock_producto").select("producto_id, stock").in("producto_id", ids).throwOnError(),
    supabase
      .from("inventario_movimientos")
      .select("id, tipo, cantidad, fecha, nota, productos(nombre), empleados(nombre)")
      .in("producto_id", ids)
      .order("fecha", { ascending: false })
      .limit(30)
      .throwOnError(),
  ]);

  return (
    <>
      <Titulo>Inventario</Titulo>
      <VistaInventario esSocio={mios.length > 0} productos={productos} stock={stock} movimientos={movimientos} />
    </>
  );
}
