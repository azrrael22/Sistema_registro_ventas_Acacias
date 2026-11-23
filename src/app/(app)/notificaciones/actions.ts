"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { destinoNotificacion } from "@/lib/notificaciones";

export async function marcarTodasLeidas() {
  await requerirEmpleadoActivo();
  const supabase = await createClient();
  await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  revalidatePath("/", "layout");
}

// Tocar una notificación la marca como leída y lleva a su pantalla. La RLS solo deja tocar las
// propias, y el destino sale de la fila guardada, no del formulario: no hay redirección abierta.
export async function abrirNotificacion(form: FormData) {
  await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", Number(form.get("id")))
    .select("tipo, datos")
    .maybeSingle();
  revalidatePath("/", "layout");
  redirect((data && destinoNotificacion(data.tipo, data.datos)) ?? "/notificaciones");
}
