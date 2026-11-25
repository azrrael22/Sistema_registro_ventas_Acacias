import "server-only";
import { createClient } from "@/server/supabase";
import { armarReporte, type Filtros } from "@/lib/reportes";

// Un solo pedido por día cubre el periodo actual y el anterior (para comparar)
export async function obtenerReporte(f: Filtros) {
  const supabase = await createClient();
  const [mov, ret, inv] = await Promise.all([
    supabase.rpc("reporte_socio", { p_granularidad: "dia", p_desde: f.antDesde, p_hasta: f.hasta }),
    supabase.rpc("retiros_socio", { p_desde: f.antDesde, p_hasta: f.hasta }),
    supabase.rpc("inventario_socio", { p_desde: f.desde, p_hasta: f.hasta }),
  ]);
  return {
    error: mov.error ?? ret.error ?? inv.error,
    ...armarReporte(f, mov.data ?? [], ret.data ?? [], inv.data ?? []),
  };
}
