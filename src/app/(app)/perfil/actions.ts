"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import { leerNombres } from "@/lib/nombres";
import type { Resultado } from "@/lib/acciones";

export async function actualizarNombre(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requerirEmpleadoActivo();
  const nombres = leerNombres(form);
  if ("error" in nombres) return nombres;
  const supabase = await createClient();
  const { error } = await supabase.from("empleados").update(nombres).eq("id", yo.id);
  if (error) return { error: mensajeError(error)! };
  // El nombre también se ve en el encabezado
  revalidatePath("/", "layout");
  return { ok: "Nombre guardado" };
}

export async function cambiarCorreo(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const email = String(form.get("email")).trim().toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (email === data?.claims?.email?.toLowerCase()) return { error: "Ese ya es tu correo" };

  const origen = (await headers()).get("origin");
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${origen}/auth/callback?next=/perfil` });
  if (error) {
    if (error.code === "email_exists") return { error: "Ese correo ya está registrado" };
    if (error.code === "email_address_invalid") return { error: "Ese correo no es válido" };
    if (error.code === "over_email_send_rate_limit") return { error: "Espera un momento antes de volver a intentarlo" };
    return { error: error.message };
  }
  revalidatePath("/perfil");
  return { ok: "Te enviamos un enlace de confirmación a tu correo actual y otro al nuevo. Ábrelos para terminar el cambio." };
}

export async function cambiarContrasena(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const password = String(form.get("password"));
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== String(form.get("confirmar"))) return { error: "Las contraseñas no coinciden" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Pedir la actual evita que alguien la cambie desde una sesión que quedó abierta.
  const { error: incorrecta } = await supabase.auth.signInWithPassword({
    email: String(data?.claims?.email),
    password: String(form.get("actual")),
  });
  if (incorrecta) return { error: "La contraseña actual no es correcta" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "La nueva contraseña debe ser distinta a la actual" };
    if (error.code === "weak_password") return { error: "Esa contraseña es muy débil; prueba con una más larga" };
    return { error: error.message };
  }
  return { ok: "Contraseña actualizada" };
}
