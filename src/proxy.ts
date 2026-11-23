import type { NextRequest } from "next/server";
import { updateSession } from "@/server/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Sin proxy: archivos estáticos, el latido y el manifest de la app instalable. El navegador pide el
// manifest sin cookies; si pasara por aquí, lo mandaría a /login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/latido|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
