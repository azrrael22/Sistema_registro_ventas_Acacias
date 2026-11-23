import type { NextRequest } from "next/server";
import { updateSession } from "@/server/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Sin proxy: archivos estáticos, el latido, el manifest de la app instalable y su service worker.
// El navegador pide el manifest sin cookies, y sin sesión el registro del service worker fallaría:
// si pasaran por aquí, los mandaría a /login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js$|api/latido|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
