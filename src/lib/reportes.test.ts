import { describe, expect, test } from "vitest";
import { leerFiltros as leer } from "@/lib/reportes";

// Hoy es el 12 nov 2026
const leerFiltros = (sp: Parameters<typeof leer>[0], fin = "2026-11-12") => leer(sp, fin);

describe("leerFiltros", () => {
  test("por defecto, el último mes y el mes anterior a ese", () => {
    expect(leerFiltros({})).toEqual({
      g: "mes",
      desde: "2026-10-12",
      hasta: "2026-11-12",
      antDesde: "2026-09-11",
      antHasta: "2026-10-11",
      qs: "g=mes",
      generado: false,
    });
  });

  test.each([
    ["trimestre", "2026-08-12", "2026-05-11", "2026-08-11"],
    ["semestre", "2026-05-12", "2025-11-11", "2026-05-11"],
    ["anio", "2025-11-12", "2024-11-11", "2025-11-11"],
  ])("%s: periodos móviles que terminan hoy", (g, desde, antDesde, antHasta) => {
    expect(leerFiltros({ g })).toEqual({ g, desde, hasta: "2026-11-12", antDesde, antHasta, qs: `g=${g}`, generado: true });
  });

  test("un periodo que no existe es mensual, pero cuenta como elegido", () => {
    expect(leerFiltros({ g: "decada" })).toMatchObject({ g: "mes", generado: true });
  });

  test.each(["toString", "constructor", "__proto__"])("«%s» no es un periodo (aunque lo herede cualquier objeto)", (g) => {
    expect(leerFiltros({ g })).toMatchObject({ g: "mes", desde: "2026-10-12" });
  });

  test("un g repetido en la URL se ignora", () => {
    expect(leerFiltros({ g: ["anio", "mes"] })).toMatchObject({ g: "mes", generado: false });
  });

  test("un rango personalizado, con el periodo anterior de la misma duración", () => {
    expect(leerFiltros({ g: "rango", desde: "2026-11-01", hasta: "2026-11-10" })).toEqual({
      g: "rango",
      desde: "2026-11-01",
      hasta: "2026-11-10",
      antDesde: "2026-10-22",
      antHasta: "2026-10-31",
      qs: "g=rango&desde=2026-11-01&hasta=2026-11-10",
      generado: true,
    });
  });

  test("el 1 de enero de 2000 es la primera fecha válida", () => {
    expect(leerFiltros({ g: "rango", desde: "2000-01-01", hasta: "2000-01-31" })).toMatchObject({ desde: "2000-01-01", hasta: "2000-01-31" });
  });

  test("un rango al revés se ordena", () => {
    expect(leerFiltros({ g: "rango", desde: "2026-11-10", hasta: "2026-11-01" })).toMatchObject({ desde: "2026-11-01", hasta: "2026-11-10" });
  });

  test.each([
    ["un día que no existe", "2026-02-30"],
    ["antes de 2000", "1999-12-31"],
    ["sin formato", "1/11/2026"],
    ["con letras", "abc"],
  ])("una fecha inválida (%s) toma el valor por defecto", (_, fecha) => {
    expect(leerFiltros({ g: "rango", desde: fecha, hasta: fecha })).toMatchObject({ desde: "2026-10-12", hasta: "2026-11-12" });
  });

  test("el mismo día del mes anterior, o su último día si es más corto", () => {
    expect(leerFiltros({}, "2026-03-31")).toMatchObject({ desde: "2026-02-28", antHasta: "2026-02-27", antDesde: "2026-01-27" });
  });
});
