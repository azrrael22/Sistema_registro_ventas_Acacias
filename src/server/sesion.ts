import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";

// Empleado de la sesión actual (una sola consulta por request).
export const getEmpleado = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: empleado } = await supabase.from("empleados").select("*").eq("id", id).single();
  return empleado;
});

// Para páginas internas: exige sesión y cuenta aprobada.
export async function requerirEmpleadoActivo() {
  const empleado = await getEmpleado();
  if (!empleado) redirect("/login");
  if (!empleado.activo) redirect("/pendiente");
  return empleado;
}

export async function requerirAdmin() {
  const empleado = await requerirEmpleadoActivo();
  if (!empleado.es_admin) redirect("/");
  return empleado;
}
