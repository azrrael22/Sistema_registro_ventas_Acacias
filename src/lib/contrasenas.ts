import type { AuthError } from "@supabase/supabase-js";

// Contraseña nueva de un formulario (campos password y confirmar): registro, Mi perfil y
// restablecer la leen con esto. Nunca se devuelve al formulario.
export function leerContrasenaNueva(form: FormData): { password: string } | { error: string } {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== String(form.get("confirmar") ?? "")) return { error: "Las contraseñas no coinciden" };
  return { password };
}

// Mensaje legible de un error de Supabase Auth al guardar una contraseña nueva
export function mensajeErrorContrasena(error: AuthError) {
  if (error.code === "same_password") return "La nueva contraseña debe ser distinta a la actual";
  if (error.code === "weak_password") return "Esa contraseña es muy débil; prueba con una más larga";
  return error.message;
}
