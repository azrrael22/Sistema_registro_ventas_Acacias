// Enlaces de los correos de Auth (auth/callback): confirmación de registro, cambio de correo y
// recuperación de contraseña.
import { rutaInterna } from "@/lib/rutas";

export type Enlace = ReturnType<typeof leerEnlace>;

export function leerEnlace(params: URLSearchParams) {
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  // Solo rutas internas: «//otro-sitio.com» o «/\otro-sitio.com» serían una redirección abierta
  const destino = rutaInterna(params.get("next")) ?? "/";
  return {
    code,
    tokenHash,
    type,
    destino,
    // Recuperación de contraseña: la plantilla propia (supabase/templates/recuperar.html) manda
    // token_hash y type=recovery; la de Supabase, un código PKCE y next=/restablecer
    recuperacion: type === "recovery" || destino === "/restablecer",
    // Cambio de correo: el primero de los dos enlaces no trae código, solo un mensaje
    soloMensaje: !code && !tokenHash && params.has("message"),
  };
}

// Enlace vencido o ya usado: cada pantalla explica qué pasó (?error=enlace). El de recuperación
// vuelve a pedir el correo; el de cambio de correo, a Mi perfil; el de confirmar la cuenta, al login.
export function rutaFalloEnlace({ recuperacion, destino }: Pick<Enlace, "recuperacion" | "destino">) {
  if (recuperacion) return "/recuperar?error=enlace";
  return destino === "/perfil" ? "/perfil?error=enlace" : "/login?error=enlace";
}
