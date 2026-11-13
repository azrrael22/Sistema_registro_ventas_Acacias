import type { NextRequest } from "next/server";
import { PERIODOS, leerFiltros, obtenerReporte } from "@/server/reportes";

const celda = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replaceAll('"', '""')}"`);

export async function GET(request: NextRequest) {
  const filtros = leerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const { categorias, productos, total, error } = await obtenerReporte(filtros);
  if (error) return new Response(error.message, { status: 400 });

  // Dos secciones: los retiros son por categoría y el inventario por producto
  const lineas = [
    ["Categoría", "Ventas netas", "Retiros", "Balance"],
    ...categorias.map((c) => [c.nombre, c.ventas, c.retiros, c.ventas - c.retiros]),
    ["Total", total.ventas, total.retiros, total.ventas - total.retiros],
    [],
    ["Producto", "Categoría", "Unidades base", "Vendidas", "Quedan", "Ventas netas"],
    ...productos.map((p) => [p.nombre, p.categoria, p.base, p.unidades, p.quedan, p.ventas]),
    ["Total", "", total.base, total.unidades, total.quedan, total.ventas],
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
