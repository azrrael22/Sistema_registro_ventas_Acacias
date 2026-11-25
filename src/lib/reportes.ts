// Reportes de los socios: periodos, tramos del gráfico y el armado del reporte con las filas de las
// RPC reporte_socio, retiros_socio e inventario_socio. Todo es puro; las consultas están en
// src/server/reportes.ts.
import type { Database } from "@/lib/database.types";

// Periodos móviles: terminan hoy y cuentan hacia atrás (Mensual el 12 nov = 12 oct → 12 nov)
export const PERIODOS = {
  mes: { texto: "Mensual", meses: 1 },
  trimestre: { texto: "Trimestral", meses: 3 },
  semestre: { texto: "Semestral", meses: 6 },
  anio: { texto: "Anual", meses: 12 },
  rango: { texto: "Personalizado", meses: 0 },
} as const;
export type Periodo = keyof typeof PERIODOS;

// Solo las claves propias: «toString» o «constructor» también están `in` cualquier objeto
const esPeriodo = (g: unknown): g is Periodo => typeof g === "string" && Object.hasOwn(PERIODOS, g);

// ---------- Fechas como 'YYYY-MM-DD' (en UTC para no depender de la zona horaria) ----------
const aDia = (d: Date) => d.toISOString().slice(0, 10);
const partes = (dia: string) => dia.split("-").map(Number);

function sumarDias(dia: string, n: number) {
  const [a, m, d] = partes(dia);
  return aDia(new Date(Date.UTC(a, m - 1, d + n)));
}

// Mismo día n meses después (n < 0: antes). Si ese mes es más corto, su último día (31 mar − 1 mes = 28 feb).
function sumarMeses(dia: string, n: number) {
  const [a, m, d] = partes(dia);
  const ultimo = new Date(Date.UTC(a, m + n, 0)).getUTCDate();
  return aDia(new Date(Date.UTC(a, m - 1 + n, Math.min(d, ultimo))));
}

const diasEntre = (desde: string, hasta: string) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);

// Un día que existe, desde el año 2000; null si no
const fechaValida = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "2000-01-01" && sumarDias(v, 0) === v ? v : null;

type Parametros = Record<string, string | string[] | undefined>;

// Rango personalizado: las fechas de la URL si son válidas (si no, el último mes), en orden
function rango(sp: Parametros, fin: string) {
  const a = fechaValida(sp.desde) ?? sumarMeses(fin, -1);
  const b = fechaValida(sp.hasta) ?? fin;
  return a <= b ? [a, b] : [b, a];
}

// Filtros del reporte a partir de la URL (?g=…&desde=…&hasta=…). `fin` es hoy.
export function leerFiltros(sp: Parametros, fin: string) {
  const g = esPeriodo(sp.g) ? sp.g : "mes";
  const [desde, hasta] = g === "rango" ? rango(sp, fin) : [sumarMeses(fin, -PERIODOS[g].meses), fin];

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
export function tramos(desde: string, hasta: string) {
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

// ---------- Armado del reporte ----------
type Funciones = Database["public"]["Functions"];
type FilaVentas = Funciones["reporte_socio"]["Returns"][number];
type FilaRetiros = Funciones["retiros_socio"]["Returns"][number];
type FilaInventario = Funciones["inventario_socio"]["Returns"][number];

type Cifras = { unidades: number; ventas: number; retiros: number };
type Fila = Cifras & { dia: string; producto_id: number | null; categoria: string | null };

const sumar = (filas: Cifras[]) =>
  filas.reduce((t, f) => ({ unidades: t.unidades + f.unidades, ventas: t.ventas + f.ventas, retiros: t.retiros + f.retiros }), {
    unidades: 0,
    ventas: 0,
    retiros: 0,
  });

// Las ventas son por producto y los retiros por categoría: van en filas separadas
function combinarFilas(mov: FilaVentas[], ret: FilaRetiros[]): Fila[] {
  return [
    ...mov.map((r) => ({
      dia: r.periodo,
      producto_id: r.producto_id,
      categoria: null,
      unidades: Number(r.unidades),
      ventas: Number(r.ventas_netas),
      retiros: 0,
    })),
    ...ret.map((r) => ({ dia: r.dia, producto_id: null, categoria: r.categoria, unidades: 0, ventas: 0, retiros: Number(r.retiros) })),
  ];
}

function cifrasProducto(p: FilaInventario, actuales: Fila[]) {
  const { unidades, ventas } = sumar(actuales.filter((r) => r.producto_id === p.producto_id));
  // Sin inventario: base, perdidas y quedan no existen (null); sus ventas sí cuentan
  const conInventario = (n: number) => (p.maneja_inventario ? n : null);
  return {
    id: p.producto_id,
    nombre: p.producto,
    categoria: p.categoria,
    base: conInventario(Number(p.unidades_base)),
    perdidas: conInventario(Number(p.unidades_perdidas)),
    // Estimado al precio actual: el precio del día de la pérdida no se guarda
    valorPerdido: conInventario(Number(p.unidades_perdidas) * Number(p.precio)),
    quedan: conInventario(Number(p.unidades_quedan)),
    unidades,
    ventas,
  };
}
type CifrasProducto = ReturnType<typeof cifrasProducto>;

const tieneCifras = (p: CifrasProducto) => !!(p.base || p.perdidas || p.quedan || p.unidades || p.ventas);

const porVentas = (a: { nombre: string; ventas: number }, b: { nombre: string; ventas: number }) =>
  b.ventas - a.ventas || a.nombre.localeCompare(b.nombre);

// Balance por categoría (el nombre es único): ventas netas de sus productos − retiros de la categoría
function balanceCategorias(productos: CifrasProducto[], actuales: Fila[]) {
  const nombres = new Set([...productos.map((p) => p.categoria), ...actuales.flatMap((r) => r.categoria ?? [])]);
  return [...nombres]
    .map((nombre) => ({
      nombre,
      ventas: productos.filter((p) => p.categoria === nombre).reduce((t, p) => t + p.ventas, 0),
      retiros: actuales.filter((r) => r.categoria === nombre).reduce((t, r) => t + r.retiros, 0),
    }))
    .sort(porVentas);
}

// Los productos sin inventario (null) suman 0
function totalesInventario(productos: CifrasProducto[]) {
  const total = (campo: "base" | "perdidas" | "valorPerdido" | "quedan") => productos.reduce((t, p) => t + (p[campo] ?? 0), 0);
  return { base: total("base"), perdidas: total("perdidas"), valorPerdido: total("valorPerdido"), quedan: total("quedan") };
}

// Reporte del periodo: ventas y retiros desde el periodo anterior (para comparar), inventario del actual
export function armarReporte(f: Pick<Filtros, "desde" | "hasta" | "antHasta">, mov: FilaVentas[], ret: FilaRetiros[], inv: FilaInventario[]) {
  const filas = combinarFilas(mov, ret);
  const actuales = filas.filter((r) => r.dia >= f.desde);
  const productos = inv
    .map((p) => cifrasProducto(p, actuales))
    .filter(tieneCifras)
    .sort(porVentas);
  const { paso, lista } = tramos(f.desde, f.hasta);
  return {
    esSocio: inv.length > 0,
    productos,
    categorias: balanceCategorias(productos, actuales),
    total: { ...sumar(actuales), ...totalesInventario(productos) },
    anterior: sumar(filas.filter((r) => r.dia <= f.antHasta)),
    paso,
    tramos: lista.map((t) => ({ ...t, ...sumar(actuales.filter((r) => r.dia >= t.inicio && r.dia <= t.fin)) })),
  };
}
