"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { destinoNotificacion } from "@/lib/notificaciones";
import { mensajeError } from "@/lib/errores";
import type { Resultado } from "@/lib/acciones";

export async function marcarTodasLeidas(): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
}

// Tocar una notificación la marca como leída y lleva a su pantalla. La RLS solo deja tocar las
// propias, y el destino sale de la fila guardada, no del formulario: no hay redirección abierta.
export async function abrirNotificacion(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", Number(form.get("id")))
    .select("tipo, datos")
    .maybeSingle();
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  redirect((data && destinoNotificacion(data.tipo, data.datos)) ?? "/notificaciones");
}
