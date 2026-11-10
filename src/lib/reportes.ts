import { createClient } from "@/lib/supabase/server";
import { hoy } from "@/lib/formato";

export const GRANULARIDADES = {
  mes: "Mensual",
  trimestre: "Trimestral",
  semestre: "Semestral",
  anio: "Anual",
} as const;
export type Granularidad = keyof typeof GRANULARIDADES;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// periodo llega como 'YYYY-MM-DD' (primer día del periodo)
export function nombrePeriodo(periodo: string, g: Granularidad) {
  const [anio, mes] = periodo.split("-").map(Number);
  switch (g) {
    case "mes": return `${MESES[mes - 1]} ${anio}`;
    case "trimestre": return `T${Math.ceil(mes / 3)} ${anio}`;
    case "semestre": return `S${mes <= 6 ? 1 : 2} ${anio}`;
    case "anio": return String(anio);
  }
}

export function leerFiltros(sp: Record<string, string | string[] | undefined>) {
  const g = (typeof sp.g === "string" && sp.g in GRANULARIDADES ? sp.g : "mes") as Granularidad;
  const fechaValida = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const hasta = fechaValida(sp.hasta) ?? hoy();
  const desde = fechaValida(sp.desde) ?? `${hasta.slice(0, 4)}-01-01`;
  return { g, desde, hasta };
}

export async function obtenerReporte({ g, desde, hasta }: ReturnType<typeof leerFiltros>) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reporte_socio", { p_granularidad: g, p_desde: desde, p_hasta: hasta });
  return {
    error,
    filas: (data ?? []).map((f) => ({
      ...f,
      ventas_netas: Number(f.ventas_netas),
      retiros: Number(f.retiros),
      unidades: Number(f.unidades),
    })),
  };
}
