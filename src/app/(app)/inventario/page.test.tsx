// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { usarSupabase } from "@/test/supabase-falso";
import InventarioPage from "./page";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("./actions", () => ({ registrarMovimiento: vi.fn() }));

// Hoy es el 25 nov 2026 a las 10:00 a. m. en Colombia
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-25T15:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const bebidas = { categorias: { nombre: "Bebidas" } };
const productos = [
  { ...bebidas, id: 1, nombre: "Gaseosa", maneja_inventario: true },
  { ...bebidas, id: 2, nombre: "Agua", maneja_inventario: true },
  { id: 3, nombre: "Tinto", maneja_inventario: false, categorias: { nombre: "Cafetería" } },
];
const movimientos = [
  { id: 10, tipo: "entrada", cantidad: 24, fecha: "2026-11-25T14:00:00Z", nota: "pedido", productos: { nombre: "Gaseosa" }, empleados: { nombre: "Ana Rojas" } },
  { id: 9, tipo: "ajuste", cantidad: -2, fecha: "2026-11-24T20:00:00Z", nota: null, productos: { nombre: "Agua" }, empleados: { nombre: "Luis Pérez" } },
  { id: 8, tipo: "ajuste", cantidad: 3, fecha: "2026-11-24T19:00:00Z", nota: null, productos: { nombre: "Agua" }, empleados: { nombre: "Luis Pérez" } },
];
const datos = (cambios = {}) =>
  usarSupabase({
    "from:socios": { data: [{ categoria_id: 1 }, { categoria_id: 2 }] },
    "from:productos": { data: productos },
    "from:stock_producto": { data: [{ producto_id: 1, stock: 12 }, { producto_id: 2, stock: 2 }] },
    "from:inventario_movimientos": { data: movimientos },
    ...cambios,
  });
const abrir = async () => render(await InventarioPage());
const tarjeta = (titulo: string) => within(screen.getByRole("heading", { name: titulo }).parentElement!);

describe("InventarioPage", () => {
  test("solo consulta los productos que llevan inventario", async () => {
    const supabase = datos();
    await abrir();
    expect(supabase.pedidos("from:stock_producto")[0]).toContainEqual(["in", "producto_id", [1, 2]]);
    expect(supabase.pedidos("from:inventario_movimientos")[0]).toEqual(
      expect.arrayContaining([["in", "producto_id", [1, 2]], ["order", "fecha", { ascending: false }], ["limit", 30]]),
    );
  });

  test("el formulario ofrece sus productos con inventario", async () => {
    datos();
    await abrir();
    const opciones = within(screen.getByRole("combobox", { name: "Producto" })).getAllByRole("option");
    expect(opciones.map((o) => o.textContent)).toEqual(["Bebidas · Gaseosa", "Bebidas · Agua"]);
    expect(within(screen.getByRole("combobox", { name: "Tipo" })).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Entrada de mercancía",
      "Conteo físico",
      "Ajuste manual",
    ]);
  });

  test("el stock actual, con el stock bajo en ámbar", async () => {
    datos();
    await abrir();
    const filas = tarjeta("Stock actual").getAllByRole("listitem");
    expect(filas.map((f) => f.textContent)).toEqual(["Gaseosa · Bebidas12", "Agua · Bebidas2"]);
    expect(within(filas[0]).getByText("12").className).not.toContain("amber");
    expect(within(filas[1]).getByText("2").className).toContain("amber");
  });

  test("un producto sin fila de stock tiene 0", async () => {
    datos({ "from:stock_producto": { data: [{ producto_id: 1, stock: null }] } });
    await abrir();
    expect(tarjeta("Stock actual").getAllByRole("listitem").map((f) => f.textContent)).toEqual(["Gaseosa · Bebidas0", "Agua · Bebidas0"]);
  });

  test("los últimos movimientos, por día y con signo; un ajuste que resta es una pérdida", async () => {
    datos();
    await abrir();
    const ultimos = tarjeta("Últimos movimientos");
    expect(ultimos.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Hoy · 25 nov 2026", "Ayer · 24 nov 2026"]);
    const filas = ultimos.getAllByRole("listitem");
    expect(filas.map((f) => f.textContent)).toEqual([
      "+24GaseosaEntrada · Ana Rojas · “pedido”9:00 a. m.",
      "−2AguaPérdida · Luis Pérez3:00 p. m.",
      "+3AguaAjuste · Luis Pérez2:00 p. m.",
    ]);
    expect(within(filas[1]).getByText("−2").className).toContain("amber");
    expect(within(filas[2]).getByText("+3").className).not.toContain("amber");
  });

  test("sin movimientos todavía", async () => {
    datos({ "from:inventario_movimientos": { data: [] } });
    await abrir();
    expect(tarjeta("Últimos movimientos").getByText("Sin movimientos todavía")).toBeTruthy();
  });

  test("quien no es socio de ninguna categoría", async () => {
    datos({ "from:socios": { data: [] } });
    await abrir();
    expect(screen.getByText("Solo los socios manejan inventario. Hazte socio de una categoría en “Productos y socios”.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Stock actual" })).toBeNull();
  });

  test("un socio cuyos productos no llevan inventario", async () => {
    datos({ "from:productos": { data: [productos[2]] } });
    await abrir();
    expect(screen.getByText("Tus productos no llevan inventario. Se activa al editar cada producto en “Productos y socios”.")).toBeTruthy();
  });
});
