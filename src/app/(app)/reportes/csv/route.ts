import type { NextRequest } from "next/server";
import { PERIODOS, leerFiltros, obtenerReporte } from "@/server/reportes";

const celda = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replaceAll('"', '""')}"`);

export async function GET(request: NextRequest) {
  const filtros = leerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const { productos, total, error } = await obtenerReporte(filtros);
  if (error) return new Response(error.message, { status: 400 });

  const lineas = [
    ["Producto", "Categoría", "Unidades base", "Vendidas", "Quedan", "Ventas netas", "Retiros", "Balance"],
    ...productos.map((p) => [p.nombre, p.categoria, p.base, p.unidades, p.quedan, p.ventas, p.retiros, p.ventas - p.retiros]),
    ["Total", "", total.base, total.unidades, total.quedan, total.ventas, total.retiros, total.ventas - total.retiros],
  ].map((fila) => fila.map(celda).join(","));
  const nombre = PERIODOS[filtros.g].texto.toLowerCase();
  // BOM para que Excel reconozca las tildes
  return new Response("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${nombre}-${filtros.desde}-a-${filtros.hasta}.csv"`,
    },
  });
}
