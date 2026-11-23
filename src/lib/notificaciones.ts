import type { Json } from "@/lib/database.types";

// Pantalla a la que lleva cada notificación al tocarla; null si no tiene una propia.
// `datos` es lo que guardan los triggers que crean la notificación (ver las migraciones).
export function destinoNotificacion(tipo: string, datos: Json | null): string | null {
  const categoria = datos && typeof datos === "object" && !Array.isArray(datos) ? datos.categoria_id : undefined;
  switch (tipo) {
    case "retiro":
      return "/retiros";
    case "nuevo_socio":
      return typeof categoria === "number" ? `/productos?categoria=${categoria}` : "/productos";
    case "registro_pendiente":
      return "/admin/empleados";
    case "cuenta_aprobada":
      return "/ventas/nueva";
    default:
      return null;
  }
}
