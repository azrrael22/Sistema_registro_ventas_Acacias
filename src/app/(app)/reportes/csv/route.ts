import type { NextRequest } from "next/server";
import { obtenerReporte } from "@/server/reportes";
import { hoy } from "@/lib/formato";
import { PERIODOS, leerFiltros } from "@/lib/reportes";

// null (inventario de un producto que no lo lleva): celda vacía. Un texto que empieza con = + - @
// Excel lo toma como fórmula: el apóstrofo lo deja como texto
const texto = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const celda = (v: string | number | null) => (v === null ? "" : typeof v === "number" ? String(v) : `"${texto(v).replaceAll('"', '""')}"`);

export async function GET(request: NextRequest) {
  const filtros = leerFiltros(Object.fromEntries(request.nextUrl.searchParams), hoy());
  const { categorias, productos, total, error } = await obtenerReporte(filtros);
  // Se abre como página: el mensaje queda a la vista en vez de descargarse un archivo roto
  if (error) {
    console.error("No se pudo generar el CSV del reporte:", error);
    const texto = "No se pudo generar el reporte porque el sistema tuvo un problema al leer los datos.\n\nVuelve atrás e inténtalo de nuevo; si sigue pasando, avísale a un administrador.";
    return new Response(texto, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Dos secciones: los retiros son por categoría y el inventario por producto
  const lineas = [
    ["Categoría", "Ventas netas", "Retiros", "Balance"],
    ...categorias.map((c) => [c.nombre, c.ventas, c.retiros, c.ventas - c.retiros]),
    ["Total", total.ventas, total.retiros, total.ventas - total.retiros],
    [],
    ["Producto", "Categoría", "Unidades base", "Vendidas", "Perdidas", "Valor perdido", "Quedan", "Ventas netas"],
    ...productos.map((p) => [p.nombre, p.categoria, p.base, p.unidades, p.perdidas, p.valorPerdido, p.quedan, p.ventas]),
    ["Total", "", total.base, total.unidades, total.perdidas, total.valorPerdido, total.quedan, total.ventas],
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
