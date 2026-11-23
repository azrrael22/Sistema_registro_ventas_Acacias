"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError, mensajeErrorAuth } from "@/lib/errores";
import { leerContrasenaNueva } from "@/lib/contrasenas";
import { leerNombres } from "@/lib/nombres";
import type { Resultado } from "@/lib/acciones";

export async function actualizarNombre(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requerirEmpleadoActivo();
  const nombres = leerNombres(form);
  if ("error" in nombres) return nombres;
  const supabase = await createClient();
  const { error } = await supabase.from("empleados").update(nombres).eq("id", yo.id);
  if (error) return { error: mensajeError(error) };
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
  if (error) return { error: mensajeErrorAuth(error) };
  revalidatePath("/perfil");
  return { ok: "Te enviamos un enlace de confirmación a tu correo actual y otro al nuevo. Ábrelos para terminar el cambio." };
}

export async function cambiarContrasena(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const clave = leerContrasenaNueva(form);
  if ("error" in clave) return clave;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Pedir la actual evita que alguien la cambie desde una sesión que quedó abierta.
  const { error: incorrecta } = await supabase.auth.signInWithPassword({
    email: String(data?.claims?.email),
    password: String(form.get("actual")),
  });
  // Solo invalid_credentials es una contraseña equivocada; lo demás (Auth caído, demasiados
  // intentos) se explica tal cual
  if (incorrecta) return { error: incorrecta.code === "invalid_credentials" ? "La contraseña actual no es correcta" : mensajeErrorAuth(incorrecta) };

  const { error } = await supabase.auth.updateUser({ password: clave.password });
  if (error) return { error: mensajeErrorAuth(error) };
  return { ok: "Contraseña actualizada" };
}
