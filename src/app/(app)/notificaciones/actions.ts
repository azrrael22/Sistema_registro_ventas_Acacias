"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { marcarLeida } from "@/server/notificaciones";
import { mensajeError } from "@/lib/errores";
import type { Resultado } from "@/lib/acciones";

export async function marcarTodasLeidas(): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
}

// Tocar una notificación la marca como leída y lleva a su pantalla (el destino sale de la fila
// guardada, no del formulario; ver marcarLeida). Los correos usan /notificaciones/[id].
export async function abrirNotificacion(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const { destino, error } = await marcarLeida(Number(form.get("id")));
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  redirect(destino ?? "/notificaciones");
}
