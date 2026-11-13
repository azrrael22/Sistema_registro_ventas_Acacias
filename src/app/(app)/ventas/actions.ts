"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import type { Resultado } from "@/lib/acciones";

// precio_unitario solo se envía si hay descuento; la BD impide que supere el precio del producto
export type ItemVenta = { producto_id: number; cantidad: number; precio_unitario?: number };

export async function registrarVenta(items: ItemVenta[], nota: string): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const validos = items.filter((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);
  if (!validos.length) return { error: "Agrega al menos un producto" };
  if (validos.some((i) => i.precio_unitario !== undefined && !(Number.isFinite(i.precio_unitario) && i.precio_unitario >= 0))) {
    return { error: "Precio inválido" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_venta", { p_items: validos, p_nota: nota });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/", "layout");
  return { ok: "Venta registrada" };
}

export async function registrarDevolucion(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const ventaId = Number(form.get("venta_id"));
  const items: ItemVenta[] = [];
  for (const [clave, valor] of form.entries()) {
    const cantidad = Number(valor);
    if (clave.startsWith("cantidad_") && cantidad > 0) {
      items.push({ producto_id: Number(clave.slice("cantidad_".length)), cantidad });
    }
  }
  if (!items.length) return { error: "Indica cuántas unidades se devuelven" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_venta", {
    p_items: items,
    p_tipo: "devolucion",
    p_venta_origen: ventaId,
    p_nota: String(form.get("nota") ?? ""),
  });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/", "layout");
  redirect("/ventas");
}
