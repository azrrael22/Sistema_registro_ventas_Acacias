"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirAdmin } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import type { Resultado } from "@/lib/acciones";

export async function actualizarEmpleado(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_empleado", {
    p_id: String(form.get("id")),
    p_activo: form.get("activo") === "true",
    p_es_admin: form.get("es_admin") === "true",
  });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/admin/empleados");
  return undefined;
}
