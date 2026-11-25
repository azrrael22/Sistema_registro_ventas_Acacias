import type { Json } from "@/lib/database.types";

// Pantalla a la que lleva cada notificación al tocarla; null si no tiene una propia.
// `datos` es lo que guardan los triggers que crean la notificación (ver las migraciones).
export function destinoNotificacion(tipo: string, datos: Json | null): string | null {
  switch (tipo) {
    case "retiro":
      return "/retiros";
    case "nuevo_socio":
      return productosDe(datos);
    case "registro_pendiente":
      return "/admin/empleados";
    case "cuenta_aprobada":
      return "/ventas/nueva";
    default:
      return null;
  }
}

// Productos, abierta en la categoría de la notificación si la trae
function productosDe(datos: Json | null) {
  const categoria = datos && typeof datos === "object" && !Array.isArray(datos) ? datos.categoria_id : undefined;
  return typeof categoria === "number" ? `/productos?categoria=${categoria}` : "/productos";
}
