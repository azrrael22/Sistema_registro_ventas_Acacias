"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/errores";
import { leerDevolucion, validarItemsVenta, type ItemVenta } from "@/lib/ventas";
import type { Resultado } from "@/lib/acciones";

export async function registrarVenta(items: ItemVenta[], nota: string): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const venta = validarItemsVenta(items);
  if ("error" in venta) return venta;
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_venta", { p_items: venta.items, p_nota: nota });
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  return { ok: "Venta registrada" };
}

export async function registrarDevolucion(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const devolucion = leerDevolucion(form);
  if ("error" in devolucion) return devolucion;
  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_venta", {
    p_items: devolucion.items,
    p_tipo: "devolucion",
    p_venta_origen: devolucion.venta_id,
    p_nota: devolucion.nota,
  });
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  redirect("/ventas");
}
