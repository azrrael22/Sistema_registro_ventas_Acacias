"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { leerDocumento } from "@/lib/documentos";

export type EstadoAuth = { error?: string; ok?: string } | undefined;

export async function iniciarSesion(_: EstadoAuth, form: FormData): Promise<EstadoAuth> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")).trim(),
    password: String(form.get("password")),
  });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Primero confirma tu correo con el enlace que te enviamos" };
    return { error: "Correo o contraseña incorrectos" };
  }
  redirect("/");
}

export async function registrarse(_: EstadoAuth, form: FormData): Promise<EstadoAuth> {
  const nombre = String(form.get("nombre")).trim();
  const password = String(form.get("password"));
  if (!nombre) return { error: "Escribe tu nombre" };
  const doc = leerDocumento(form);
  if ("error" in doc) return doc;
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== String(form.get("confirmar"))) return { error: "Las contraseñas no coinciden" };

  const origen = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")).trim(),
    password,
    options: {
      data: { nombre, tipo_documento: doc.tipo, numero_documento: doc.numero },
      emailRedirectTo: `${origen}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Ese correo ya está registrado" };
    // Documento repetido: el índice único hace fallar el trigger que crea el perfil.
    // Según la versión de Auth llega el código de Postgres o solo un mensaje genérico.
    if (error.code === "23505" || error.message === "Database error saving new user") {
      return { error: "Ese documento ya está registrado" };
    }
    return { error: error.message };
  }

  // Si el proyecto no exige confirmar el correo, la sesión ya existe.
  if (data.session) redirect("/pendiente");
  return { ok: "Te enviamos un correo para confirmar tu cuenta. Después un administrador debe aprobarla." };
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
