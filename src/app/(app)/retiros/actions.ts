"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/errores";
import { leerRetiro } from "@/lib/retiros";
import type { Resultado } from "@/lib/acciones";

export async function registrarRetiro(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const retiro = leerRetiro(form);
  if ("error" in retiro) return retiro;
  const supabase = await createClient();
  const { error } = await supabase.from("retiros").insert(retiro);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  return { ok: "Retiro registrado. Se notificó a los demás socios." };
}
