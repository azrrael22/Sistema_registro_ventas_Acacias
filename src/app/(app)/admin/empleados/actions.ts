"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirAdmin } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import { leerDocumento } from "@/lib/documentos";
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

export async function actualizarDocumento(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirAdmin();
  const doc = leerDocumento(form);
  if ("error" in doc) return doc;
  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_documento_empleado", {
    p_id: String(form.get("id")),
    p_tipo: doc.tipo,
    p_numero: doc.numero,
  });
  if (error) return { error: error.code === "23505" ? "Ese documento ya está registrado" : mensajeError(error)! };
  revalidatePath("/admin/empleados");
  return { ok: "Documento guardado" };
}
