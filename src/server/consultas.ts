import "server-only";
import { createClient } from "@/server/supabase";

// Ids de las categorías donde el empleado es socio activo.
export async function misCategorias(empleadoId: string) {
  const supabase = await createClient();
  const { data: socios } = await supabase
    .from("socios")
    .select("categoria_id")
    .eq("empleado_id", empleadoId)
    .eq("activo", true);
  return socios?.map((s) => s.categoria_id) ?? [];
}

// Productos de las categorías donde el empleado es socio activo.
export async function misProductos(empleadoId: string) {
  const categorias = await misCategorias(empleadoId);
  if (!categorias.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, precio, activo, categoria_id, categorias(nombre)")
    .in("categoria_id", categorias)
    .order("nombre");
  return data ?? [];
}
