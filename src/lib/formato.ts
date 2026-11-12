export const ZONA = "America/Bogota";

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const dinero = (n: number | string | null | undefined) => pesos.format(Number(n ?? 0));

// $48 k, $1,5 M (ejes y etiquetas de gráficos)
const pesosCorto = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", notation: "compact", maximumFractionDigits: 1 });
export const dineroCorto = (n: number) => pesosCorto.format(n);

const pct = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 0 });
const pctSigno = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
export const porcentaje = (n: number, conSigno = false) => (conSigno ? pctSigno : pct).format(n);

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// Día 'YYYY-MM-DD' como «12 oct 2026». No pasa por Date para que la zona horaria no lo corra un día.
export function fechaCorta(dia: string, conAnio = true) {
  const [a, m, d] = dia.split("-").map(Number);
  return `${d} ${MESES[m - 1]}${conAnio ? ` ${a}` : ""}`;
}
// «12 oct – 12 nov 2026», o con ambos años si son distintos
export const rangoFechas = (desde: string, hasta: string) =>
  `${fechaCorta(desde, desde.slice(0, 4) !== hasta.slice(0, 4))} – ${fechaCorta(hasta)}`;

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
