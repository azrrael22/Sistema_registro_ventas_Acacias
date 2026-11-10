import type { NextRequest } from "next/server";
import { leerFiltros, nombrePeriodo, obtenerReporte } from "@/server/reportes";

const celda = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replaceAll('"', '""')}"`);

export async function GET(request: NextRequest) {
  const filtros = leerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const { filas, error } = await obtenerReporte(filtros);
  if (error) return new Response(error.message, { status: 400 });

  const lineas = [
    ["Periodo", "Producto", "Unidades", "Ventas netas", "Retiros"].map(celda).join(","),
    ...filas.map((f) =>
      [nombrePeriodo(f.periodo, filtros.g), f.producto, f.unidades, f.ventas_netas, f.retiros].map(celda).join(","),
    ),
  ];
  // BOM para que Excel reconozca las tildes
  return new Response("﻿" + lineas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${filtros.g}-${filtros.desde}-a-${filtros.hasta}.csv"`,
    },
  });
}
