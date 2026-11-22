"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { leerDocumento } from "@/lib/documentos";
import { leerNombres } from "@/lib/nombres";

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

  const password = String(form.get("password"));
  const nombres = leerNombres(form);
  if ("error" in nombres) return fallo(nombres.error);
  const doc = leerDocumento(form);
  if ("error" in doc) return fallo(doc.error);
  if (password.length < 8) return fallo("La contraseña debe tener al menos 8 caracteres");
  if (password !== String(form.get("confirmar"))) return fallo("Las contraseñas no coinciden");

  const origen = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email")).trim(),
    password,
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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
