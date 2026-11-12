import "server-only";
import { createClient } from "@/server/supabase";
import { hoy } from "@/lib/formato";

// Periodos móviles: terminan hoy y cuentan hacia atrás (Mensual el 12 nov = 12 oct → 12 nov)
export const PERIODOS = {
  mes: { texto: "Mensual", meses: 1 },
  trimestre: { texto: "Trimestral", meses: 3 },
  semestre: { texto: "Semestral", meses: 6 },
  anio: { texto: "Anual", meses: 12 },
  rango: { texto: "Personalizado", meses: 0 },
} as const;
export type Periodo = keyof typeof PERIODOS;

// ---------- Fechas como 'YYYY-MM-DD' (en UTC para no depender de la zona horaria) ----------
const aDia = (d: Date) => d.toISOString().slice(0, 10);
const partes = (dia: string) => dia.split("-").map(Number);

export function sumarDias(dia: string, n: number) {
  const [a, m, d] = partes(dia);
  return aDia(new Date(Date.UTC(a, m - 1, d + n)));
}

// Mismo día n meses después (n < 0: antes). Si ese mes es más corto, su último día (31 mar − 1 mes = 28 feb).
export function sumarMeses(dia: string, n: number) {
  const [a, m, d] = partes(dia);
  const ultimo = new Date(Date.UTC(a, m + n, 0)).getUTCDate();
  return aDia(new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo))));
}

const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);

export function leerFiltros(sp: Record<string, string | string[] | undefined>) {
  const g = (typeof sp.g === "string" && sp.g in PERIODOS ? sp.g : "mes") as Periodo;
  const fechaValida = (v: unknown) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "2000-01-01" && sumarDias(v, 0) === v ? v : null;
  const fin = hoy();

  let desde = sumarMeses(fin, -PERIODOS[g].meses);
  let hasta = fin;
  if (g === "rango") {
    const a = fechaValida(sp.desde) ?? sumarMeses(fin, -1);
    const b = fechaValida(sp.hasta) ?? fin;
    [desde, hasta] = a <= b ? [a, b] : [b, a];
  }

  // Periodo anterior de la misma duración, justo antes de "desde"
  const antHasta = sumarDias(desde, -1);
  const antDesde = g === "rango" ? sumarDias(antHasta, -diasEntre(desde, hasta)) : sumarMeses(antHasta, -PERIODOS[g].meses);
  const qs = new URLSearchParams(g === "rango" ? { g, desde, hasta } : { g }).toString();

  // generado: el usuario eligió el periodo (no es la carga inicial de la página)
  return { g, desde, hasta, antDesde, antHasta, qs, generado: typeof sp.g === "string" };
}
export type Filtros = ReturnType<typeof leerFiltros>;

// Tramos del gráfico de tendencia, avanzando desde "desde": semanas hasta ~2 meses,
// meses hasta un año y luego tramos de varios meses (unas 12 barras como máximo).
// Devuelve el paso en meses (0 = semanas).
function tramos(desde: string, hasta: string) {
  const dias = diasEntre(desde, hasta);
  const paso = dias <= 62 ? 0 : Math.ceil(dias / 366);
  const inicio = (i: number) => (paso ? sumarMeses(desde, i * paso) : sumarDias(desde, 7 * i));
  const lista: { inicio: string; fin: string }[] = [];
  for (let i = 0; inicio(i) <= hasta; i++) {
    const fin = sumarDias(inicio(i + 1), -1);
    lista.push({ inicio: inicio(i), fin: fin < hasta ? fin : hasta });
  }
  // Los rangos incluyen ambos extremos: un día suelto al final se une al tramo anterior
  if (lista.length > 1 && lista[lista.length - 1].inicio === hasta) {
    lista.pop();
    lista[lista.length - 1].fin = hasta;
  }
  return { paso, lista };
}

type Cifras = { unidades: number; ventas: number; retiros: number };
const sumar = (filas: Cifras[]) =>
  filas.reduce((t, f) => ({ unidades: t.unidades + f.unidades, ventas: t.ventas + f.ventas, retiros: t.retiros + f.retiros }), {
    unidades: 0,
    ventas: 0,
    retiros: 0,
  });

export async function obtenerReporte(f: Filtros) {
  const supabase = await createClient();
  // Un solo pedido por día cubre el periodo actual y el anterior (para comparar)
  const [mov, inv] = await Promise.all([
    supabase.rpc("reporte_socio", { p_granularidad: "dia", p_desde: f.antDesde, p_hasta: f.hasta }),
    supabase.rpc("inventario_socio", { p_desde: f.desde, p_hasta: f.hasta }),
  ]);

  const filas = (mov.data ?? []).map((r) => ({
    dia: r.periodo,
    producto_id: r.producto_id,
    unidades: Number(r.unidades),
    ventas: Number(r.ventas_netas),
    retiros: Number(r.retiros),
  }));
  const actuales = filas.filter((r) => r.dia >= f.desde);

  const productos = (inv.data ?? [])
    .map((p) => ({
      id: p.producto_id,
      nombre: p.producto,
      categoria: p.categoria,
      base: Number(p.unidades_base),
      quedan: Number(p.unidades_quedan),
      ...sumar(actuales.filter((r) => r.producto_id === p.producto_id)),
    }))
    .filter((p) => p.base || p.quedan || p.unidades || p.ventas || p.retiros)
    .sort((a, b) => b.ventas - a.ventas || a.nombre.localeCompare(b.nombre));

  const { paso, lista } = tramos(f.desde, f.hasta);
  return {
    error: mov.error ?? inv.error,
    esSocio: !!inv.data?.length,
    productos,
    total: {
      ...sumar(actuales),
      base: productos.reduce((t, p) => t + p.base, 0),
      quedan: productos.reduce((t, p) => t + p.quedan, 0),
    },
    anterior: sumar(filas.filter((r) => r.dia <= f.antHasta)),
    paso,
    tramos: lista.map((t) => ({ ...t, ...sumar(actuales.filter((r) => r.dia >= t.inicio && r.dia <= t.fin)) })),
  };
}
