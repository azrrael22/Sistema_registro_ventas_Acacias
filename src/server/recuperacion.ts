import "server-only";
import { cookies } from "next/headers";

// El enlace del correo de recuperación (auth/callback) deja esta cookie, con el id del usuario.
// Solo con ella /restablecer cambia la contraseña sin pedir la actual: así una sesión que quedó
// abierta no sirve para saltarse lo que exige Mi perfil.
const COOKIE = "recuperacion";

export async function marcarRecuperacion(usuarioId: string) {
  (await cookies()).set(COOKIE, usuarioId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
}

export async function enRecuperacion(usuarioId: string | undefined) {
  return !!usuarioId && (await cookies()).get(COOKIE)?.value === usuarioId;
}

export async function terminarRecuperacion() {
  (await cookies()).delete(COOKIE);
}
