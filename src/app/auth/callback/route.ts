import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/server/supabase";
import { marcarRecuperacion } from "@/server/recuperacion";

// Destino de los enlaces de los correos de Auth: confirmación de registro, cambio de correo y
// recuperación de contraseña.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Solo rutas internas: «//otro-sitio.com» sería una redirección abierta
  const next = searchParams.get("next");
  const destino = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
  // Recuperación de contraseña: la plantilla propia (supabase/templates/recuperar.html) manda
  // token_hash y type=recovery; la de Supabase, un código PKCE y next=/restablecer
  const recuperacion = type === "recovery" || destino === "/restablecer";

  // Cambio de correo: el primero de los dos enlaces no trae código, solo un mensaje
  if (!code && !tokenHash && searchParams.has("message")) return NextResponse.redirect(new URL(destino, origin));

  const supabase = await createClient();

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: null, error: new Error("Enlace inválido") };

  if (error) return NextResponse.redirect(new URL(recuperacion ? "/recuperar?error=enlace" : "/login", origin));
  if (recuperacion && data?.user) {
    await marcarRecuperacion(data.user.id);
    return NextResponse.redirect(new URL("/restablecer", origin));
  }
  return NextResponse.redirect(new URL(destino, origin));
}
