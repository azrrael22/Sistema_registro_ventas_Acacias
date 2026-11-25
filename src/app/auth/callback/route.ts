import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/server/supabase";
import { marcarRecuperacion } from "@/server/recuperacion";
import { leerEnlace, rutaFalloEnlace, type Enlace } from "@/lib/enlaces";

// Destino de los enlaces de los correos de Auth: confirmación de registro, cambio de correo y
// recuperación de contraseña.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, origin));
  const enlace = leerEnlace(searchParams);
  if (enlace.soloMensaje) return ir(enlace.destino);

  const { data, error } = await abrirSesion(enlace);
  if (error) return ir(rutaFalloEnlace(enlace));
  if (enlace.recuperacion && data.user) {
    await marcarRecuperacion(data.user.id);
    return ir("/restablecer");
  }
  return ir(enlace.destino);
}

// Abre la sesión que trae el enlace: un código PKCE o un token_hash con su tipo
async function abrirSesion({ code, tokenHash, type }: Enlace) {
  const supabase = await createClient();
  if (code) return supabase.auth.exchangeCodeForSession(code);
  if (tokenHash && type) return supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return { data: { user: null }, error: new Error("Enlace inválido") };
}
