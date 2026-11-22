import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/server/supabase";

// Destino del enlace de confirmación de correo (registro y cambio de correo).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Solo rutas internas: «//otro-sitio.com» sería una redirección abierta
  const next = searchParams.get("next");
  const destino = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  // Cambio de correo: el primero de los dos enlaces no trae código, solo un mensaje
  if (!code && !tokenHash && searchParams.has("message")) return NextResponse.redirect(new URL(destino, origin));

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Enlace inválido") };

  return NextResponse.redirect(new URL(error ? "/login" : destino, origin));
}
