"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { enRecuperacion, terminarRecuperacion } from "@/server/recuperacion";
import { leerContrasenaNueva, mensajeErrorContrasena } from "@/lib/contrasenas";
import { leerDocumento } from "@/lib/documentos";
import { leerNombres } from "@/lib/nombres";
import type { Resultado } from "@/lib/acciones";

// `valores` devuelve lo que se envió para que el formulario no se vacíe cuando hay un error
// (React reinicia el <form> al terminar la acción). Las contraseñas nunca se devuelven.
export type EstadoAuth = { error?: string; ok?: string; valores?: Record<string, string> } | undefined;

const CAMPOS_REGISTRO = [
  "primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido",
  "tipo_documento", "numero_documento", "email",
];

export async function iniciarSesion(_: EstadoAuth, form: FormData): Promise<EstadoAuth> {
  const email = String(form.get("email")).trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(form.get("password")) });
  if (error) {
    const valores = { email };
    if (error.code === "email_not_confirmed") return { error: "Primero confirma tu correo con el enlace que te enviamos", valores };
    return { error: "Correo o contraseña incorrectos", valores };
  }
  redirect("/");
}

export async function registrarse(_: EstadoAuth, form: FormData): Promise<EstadoAuth> {
  const valores = Object.fromEntries(CAMPOS_REGISTRO.map((c) => [c, String(form.get(c) ?? "")]));
  const fallo = (error: string) => ({ error, valores });

  const nombres = leerNombres(form);
  if ("error" in nombres) return fallo(nombres.error);
  const doc = leerDocumento(form);
  if ("error" in doc) return fallo(doc.error);
  const clave = leerContrasenaNueva(form);
  if ("error" in clave) return fallo(clave.error);

  const origen = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")).trim(),
    password: clave.password,
    options: {
      data: { ...nombres, tipo_documento: doc.tipo, numero_documento: doc.numero },
      emailRedirectTo: `${origen}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return fallo("Ese correo ya está registrado");
    // Documento repetido: el índice único hace fallar el trigger que crea el perfil.
    // Según la versión de Auth llega el código de Postgres o solo un mensaje genérico.
    if (error.code === "23505" || error.message === "Database error saving new user") {
      return fallo("Ese documento ya está registrado");
    }
    return fallo(error.message);
  }

  // Si el proyecto no exige confirmar el correo, la sesión ya existe.
  if (data.session) redirect("/pendiente");
  return { ok: "Te enviamos un correo para confirmar tu cuenta. Después un administrador debe aprobarla." };
}

// Envía el correo para crear una contraseña nueva. Su enlace pasa por auth/callback, que deja la
// cookie de recuperación y lleva a /restablecer.
export async function solicitarRecuperacion(_: Resultado, form: FormData): Promise<Resultado> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo" };
  const origen = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origen}/auth/callback?next=/restablecer` });
  if (error?.code === "over_email_send_rate_limit") return { error: "Espera un momento antes de volver a intentarlo" };
  // La misma respuesta exista o no la cuenta: así no se puede averiguar quién está registrado
  return { ok: "Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también el correo no deseado." };
}

export async function restablecerContrasena(_: Resultado, form: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!(await enRecuperacion(data?.claims?.sub))) {
    return { error: "El enlace ya no es válido. Pide uno nuevo desde «¿Olvidaste tu contraseña?»" };
  }
  const clave = leerContrasenaNueva(form);
  if ("error" in clave) return clave;
  const { error } = await supabase.auth.updateUser({ password: clave.password });
  if (error) return { error: mensajeErrorContrasena(error) };
  await terminarRecuperacion();
  // Ya con la sesión del enlace: entra a la app (o a /pendiente si la cuenta no está aprobada)
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
