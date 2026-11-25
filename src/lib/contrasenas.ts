import { texto } from "@/lib/formulario";

// Contraseña nueva de un formulario (campos password y confirmar): registro, Mi perfil y
// restablecer la leen con esto. Nunca se devuelve al formulario.
export function leerContrasenaNueva(form: FormData): { password: string } | { error: string } {
  const password = texto(form, "password");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };
  if (password !== texto(form, "confirmar")) return { error: "Las contraseñas no coinciden" };
  return { password };
}
