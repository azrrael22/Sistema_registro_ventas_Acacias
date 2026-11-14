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

const diaIso = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });
const hora = new Intl.DateTimeFormat("es-CO", { timeZone: ZONA, timeStyle: "short" });
// «10 nov 2026, 1:35 p. m.» en hora de Colombia, con los mismos meses que fechaCorta
export const fecha = (iso: string) => {
  const d = new Date(iso);
  return `${fechaCorta(diaIso.format(d))}, ${hora.format(d)}`;
};

// Fecha de hoy (YYYY-MM-DD) en hora de Colombia
export const hoy = () => diaIso.format(new Date());

// Fecha de ayer (YYYY-MM-DD) en hora de Colombia: se resta un día al calendario, no 24 h al reloj
export function ayer() {
  const [a, m, d] = hoy().split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d - 1)).toISOString().slice(0, 10);
}

// Día (YYYY-MM-DD) y hora («1:35 p. m.») de un instante, en hora de Colombia
export const diaDe = (iso: string) => diaIso.format(new Date(iso));
export const horaDe = (iso: string) => hora.format(new Date(iso));

// Agrupa por día (hora de Colombia) una lista ya ordenada por fecha, sin cambiar el orden
export function porDia<T extends { fecha: string }>(lista: T[]) {
  const dias = new Map<string, T[]>();
  for (const x of lista) {
    const dia = diaDe(x.fecha);
    const delDia = dias.get(dia);
    if (delDia) delDia.push(x);
    else dias.set(dia, [x]);
  }
  return [...dias];
}

// Encabezado de un día en las listas: «Hoy · 13 nov 2026», «Ayer · 12 nov 2026» o «11 nov 2026»
export function tituloDia(dia: string) {
  if (dia === hoy()) return `Hoy · ${fechaCorta(dia)}`;
  if (dia === ayer()) return `Ayer · ${fechaCorta(dia)}`;
  return fechaCorta(dia);
}

// Mensaje legible a partir de un error de Supabase/Postgres
export function mensajeError(error: { message: string; code?: string } | null) {
  if (!error) return null;
  if (error.code === "42501") return "No tienes permiso para hacer esto";
  if (error.code === "23505") return "Ya existe un registro con ese nombre";
  return error.message;
}
