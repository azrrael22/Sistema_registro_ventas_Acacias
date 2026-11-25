import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { usarSupabase } from "@/test/supabase-falso";
import { hoy } from "@/lib/formato";
import { leerFiltros as leer } from "@/lib/reportes";
import { obtenerReporte } from "@/server/reportes";

const leerFiltros = (sp: Parameters<typeof leer>[0]) => leer(sp, hoy());

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);

// Hoy es el 12 nov 2026 en Colombia
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-12T15:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

// Ventas por producto y día, retiros por categoría y día, e inventario del periodo
const mov = [
  { periodo: "2026-10-01", producto_id: 1, producto: "Gaseosa", unidades: 5, ventas_netas: 12500 },
  { periodo: "2026-10-20", producto_id: 1, producto: "Gaseosa", unidades: 4, ventas_netas: 10000 },
  { periodo: "2026-11-05", producto_id: 2, producto: "Tinto", unidades: 10, ventas_netas: 15000 },
  { periodo: "2026-11-12", producto_id: 1, producto: "Gaseosa", unidades: 2, ventas_netas: 5000 },
];
const ret = [
  { dia: "2026-10-05", categoria: "Bebidas", categoria_id: 1, retiros: 3000 },
  { dia: "2026-11-01", categoria: "Bebidas", categoria_id: 1, retiros: 8000 },
  { dia: "2026-11-02", categoria: "Snacks", categoria_id: 3, retiros: 1000 },
];
const producto = { unidades_base: 0, unidades_perdidas: 0, unidades_quedan: 0, maneja_inventario: true };
const inv = [
  { ...producto, producto_id: 1, producto: "Gaseosa", categoria: "Bebidas", unidades_base: 20, unidades_perdidas: 2, unidades_quedan: 12, precio: 2500 },
  { ...producto, producto_id: 2, producto: "Tinto", categoria: "Cafetería", maneja_inventario: false, precio: 1500 },
  { ...producto, producto_id: 3, producto: "Chicle", categoria: "Bebidas", precio: 500 },
];
const reporte = (programadas = {}) =>
  usarSupabase({ "rpc:reporte_socio": { data: mov }, "rpc:retiros_socio": { data: ret }, "rpc:inventario_socio": { data: inv }, ...programadas });

describe("obtenerReporte", () => {
  test("pide un día por fila, desde el periodo anterior", async () => {
    const supabase = reporte();
    await obtenerReporte(leerFiltros({}));
    expect(supabase.pedidos("rpc:reporte_socio")[0][0]).toEqual(["rpc", "reporte_socio", { p_granularidad: "dia", p_desde: "2026-09-11", p_hasta: "2026-11-12" }]);
    expect(supabase.pedidos("rpc:retiros_socio")[0][0]).toEqual(["rpc", "retiros_socio", { p_desde: "2026-09-11", p_hasta: "2026-11-12" }]);
    expect(supabase.pedidos("rpc:inventario_socio")[0][0]).toEqual(["rpc", "inventario_socio", { p_desde: "2026-10-12", p_hasta: "2026-11-12" }]);
  });

  test("combina ventas, retiros e inventario del periodo", async () => {
    reporte();
    expect(await obtenerReporte(leerFiltros({}))).toEqual({
      error: null,
      esSocio: true,
      productos: [
        { id: 1, nombre: "Gaseosa", categoria: "Bebidas", base: 20, perdidas: 2, valorPerdido: 5000, quedan: 12, unidades: 6, ventas: 15000 },
        { id: 2, nombre: "Tinto", categoria: "Cafetería", base: null, perdidas: null, valorPerdido: null, quedan: null, unidades: 10, ventas: 15000 },
      ],
      categorias: [
        { nombre: "Bebidas", ventas: 15000, retiros: 8000 },
        { nombre: "Cafetería", ventas: 15000, retiros: 0 },
        { nombre: "Snacks", ventas: 0, retiros: 1000 },
      ],
      total: { unidades: 16, ventas: 30000, retiros: 9000, base: 20, perdidas: 2, valorPerdido: 5000, quedan: 12 },
      anterior: { unidades: 5, ventas: 12500, retiros: 3000 },
      paso: 0,
      tramos: [
        { inicio: "2026-10-12", fin: "2026-10-18", unidades: 0, ventas: 0, retiros: 0 },
        { inicio: "2026-10-19", fin: "2026-10-25", unidades: 4, ventas: 10000, retiros: 0 },
        { inicio: "2026-10-26", fin: "2026-11-01", unidades: 0, ventas: 0, retiros: 8000 },
        { inicio: "2026-11-02", fin: "2026-11-08", unidades: 10, ventas: 15000, retiros: 1000 },
        { inicio: "2026-11-09", fin: "2026-11-12", unidades: 2, ventas: 5000, retiros: 0 },
      ],
    });
  });

  test("los productos van de más a menos ventas", async () => {
    const vendido = (producto_id: number, ventas_netas: number) => ({ periodo: "2026-11-01", producto_id, producto: "", unidades: 1, ventas_netas });
    reporte({
      "rpc:reporte_socio": { data: [vendido(1, 100), vendido(2, 900), vendido(3, 500)] },
      "rpc:retiros_socio": { data: [] },
      "rpc:inventario_socio": {
        data: [
          { ...producto, producto_id: 1, producto: "Bajo", categoria: "C1", precio: 1 },
          { ...producto, producto_id: 2, producto: "Alto", categoria: "C2", precio: 1 },
          { ...producto, producto_id: 3, producto: "Medio", categoria: "C3", precio: 1 },
        ],
      },
    });
    const r = await obtenerReporte(leerFiltros({}));
    expect(r.productos.map((p) => p.nombre)).toEqual(["Alto", "Medio", "Bajo"]);
    expect(r.categorias.map((c) => c.nombre)).toEqual(["C2", "C3", "C1"]);
  });

  test("los bordes del periodo: el primer día es del actual y el día anterior, del periodo anterior", async () => {
    reporte({
      "rpc:reporte_socio": {
        data: [
          { periodo: "2026-10-12", producto_id: 1, producto: "Gaseosa", unidades: 1, ventas_netas: 2500 },
          { periodo: "2026-10-11", producto_id: 1, producto: "Gaseosa", unidades: 3, ventas_netas: 7500 },
        ],
      },
      "rpc:retiros_socio": { data: [] },
      "rpc:inventario_socio": { data: [inv[0]] },
    });
    expect(await obtenerReporte(leerFiltros({}))).toMatchObject({
      esSocio: true,
      total: { unidades: 1, ventas: 2500 },
      anterior: { unidades: 3, ventas: 7500 },
    });
  });

  test.each([
    ["solo unidades (vendido a 0)", 2, 0],
    ["solo ventas netas", 0, 3000],
  ])("un producto sin inventario con %s sí aparece", async (_, unidades, ventas_netas) => {
    reporte({
      "rpc:reporte_socio": { data: [{ periodo: "2026-11-01", producto_id: 2, producto: "Tinto", unidades, ventas_netas }] },
      "rpc:retiros_socio": { data: [] },
      "rpc:inventario_socio": { data: [inv[1]] },
    });
    expect((await obtenerReporte(leerFiltros({}))).productos.map((p) => p.nombre)).toEqual(["Tinto"]);
  });

  test("los productos con las mismas ventas van por nombre", async () => {
    reporte({
      "rpc:reporte_socio": { data: [] },
      "rpc:retiros_socio": { data: [] },
      "rpc:inventario_socio": { data: [{ ...inv[0], producto: "Zumo" }, { ...inv[0], producto_id: 4, producto: "Agua" }] },
    });
    expect((await obtenerReporte(leerFiltros({}))).productos.map((p) => p.nombre)).toEqual(["Agua", "Zumo"]);
  });

  test("un producto solo con pérdidas o solo con stock sí aparece", async () => {
    reporte({
      "rpc:reporte_socio": { data: [] },
      "rpc:retiros_socio": { data: [] },
      "rpc:inventario_socio": {
        data: [
          { ...producto, producto_id: 5, producto: "Perdido", categoria: "X", unidades_perdidas: 1, precio: 100 },
          { ...producto, producto_id: 6, producto: "Quieto", categoria: "X", unidades_quedan: 3, precio: 100 },
          { ...producto, producto_id: 7, producto: "Base", categoria: "X", unidades_base: 3, precio: 100 },
        ],
      },
    });
    expect((await obtenerReporte(leerFiltros({}))).productos.map((p) => p.nombre)).toEqual(["Base", "Perdido", "Quieto"]);
  });

  test("sin productos de sus sociedades no es socio", async () => {
    usarSupabase();
    expect(await obtenerReporte(leerFiltros({}))).toMatchObject({ esSocio: false, productos: [], categorias: [], anterior: { unidades: 0, ventas: 0, retiros: 0 } });
  });

  test.each(["rpc:reporte_socio", "rpc:retiros_socio", "rpc:inventario_socio"])("si falla %s, el reporte trae el error", async (clave) => {
    const error = { message: "fetch failed" };
    reporte({ [clave]: { error } });
    expect((await obtenerReporte(leerFiltros({}))).error).toEqual(error);
  });

  describe("tramos del gráfico", () => {
    const tramos = async (sp: Record<string, string>) => {
      usarSupabase();
      const r = await obtenerReporte(leerFiltros(sp));
      return { paso: r.paso, tramos: r.tramos.map((t) => `${t.inicio}..${t.fin}`) };
    };

    test("un día suelto al final se une al tramo anterior", async () => {
      expect(await tramos({ g: "rango", desde: "2026-11-01", hasta: "2026-11-15" })).toEqual({
        paso: 0,
        tramos: ["2026-11-01..2026-11-07", "2026-11-08..2026-11-15"],
      });
    });

    test("un solo día es un solo tramo", async () => {
      expect(await tramos({ g: "rango", desde: "2026-11-12", hasta: "2026-11-12" })).toEqual({ paso: 0, tramos: ["2026-11-12..2026-11-12"] });
    });

    test("hasta 62 días van por semanas", async () => {
      expect((await tramos({ g: "rango", desde: "2026-09-01", hasta: "2026-11-02" })).paso).toBe(0);
    });

    test("de 63 días a un año, por meses", async () => {
      expect((await tramos({ g: "rango", desde: "2026-09-01", hasta: "2026-11-03" })).paso).toBe(1);
      expect(await tramos({ g: "anio" })).toMatchObject({
        paso: 1,
        tramos: expect.arrayContaining(["2025-11-12..2025-12-11", "2026-10-12..2026-11-12"]),
      });
    });

    test("más de un año, tramos de varios meses", async () => {
      expect(await tramos({ g: "rango", desde: "2024-11-12", hasta: "2026-11-12" })).toMatchObject({
        paso: 2,
        tramos: expect.arrayContaining(["2024-11-12..2025-01-11", "2026-09-12..2026-11-12"]),
      });
    });
  });
});
