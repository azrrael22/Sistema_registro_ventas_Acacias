export const ZONA = "America/Bogota";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const dinero = (n: number | string | null | undefined) => pesos.format(Number(n ?? 0));

const fechaHora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, dateStyle: "medium", timeStyle: "short" });
export const fecha = (iso: string) => fechaHora.format(new Date(iso));

// Fecha de hoy (YYYY-MM-DD) en hora de Colombia
export const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());

// Mensaje legible a partir de un error de Supabase/Postgres
export function mensajeError(error: { message: string; code?: string } | null) {
  if (!error) return null;
  if (error.code === "42501") return "No tienes permiso para hacer esto.";
  if (error.code === "23505") return "Ya existe un registro con ese nombre.";
  return error.message;
}
