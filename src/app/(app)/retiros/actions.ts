"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirEmpleadoActivo } from "@/lib/sesion";
import { mensajeError } from "@/lib/formato";
import type { Resultado } from "@/lib/acciones";

export async function registrarRetiro(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const monto = Number(form.get("monto"));
  if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor que 0." };
  const supabase = await createClient();
  const { error } = await supabase.from("retiros").insert({
    producto_id: Number(form.get("producto_id")),
    monto,
    nota: String(form.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/", "layout");
  return { ok: "Retiro registrado. Se notificó a los demás socios." };
}
