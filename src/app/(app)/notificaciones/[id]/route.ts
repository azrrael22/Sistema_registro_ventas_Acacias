import { redirect } from "next/navigation";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { marcarLeida } from "@/server/notificaciones";

// Enlace de los correos de notificación (Edge Function enviar-notificacion): marca la notificación
// como leída y lleva a su pantalla. Sin sesión, el proxy manda a /login?destino=… y se vuelve aquí
// después de ingresar. Los revisores de enlaces de los correos llegan sin cookies: no marcan nada.
export async function GET(_: Request, { params }: RouteContext<"/notificaciones/[id]">) {
  await requerirEmpleadoActivo();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) redirect("/notificaciones");
  const { destino, error } = await marcarLeida(id);
  // La lista de notificaciones vuelve a consultar y, si la base de datos sigue fallando, lo explica
  if (error) console.error("No se pudo abrir la notificación del correo:", error);
  redirect(destino ?? "/notificaciones");
}
