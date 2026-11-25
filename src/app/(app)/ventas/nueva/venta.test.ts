import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { productosEnVenta } from "./venta";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proyecto.supabase.co");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const fila = { foto: null, maneja_inventario: true, categorias: { nombre: "Bebidas" } };

describe("productosEnVenta", () => {
  test("cada producto con su stock, ordenados por categoría y nombre", () => {
    expect(
      productosEnVenta(
        [
          { ...fila, id: 1, nombre: "Tinto", precio: 1500, maneja_inventario: false, categorias: { nombre: "Cafetería" } },
          { ...fila, id: 2, nombre: "Gaseosa", precio: 2500, foto: "2/1.webp" },
          { ...fila, id: 3, nombre: "Agua", precio: 2000 },
        ],
        [
          { producto_id: 2, stock: 7 },
          { producto_id: 1, stock: 99 },
        ],
      ),
    ).toEqual([
      { id: 3, nombre: "Agua", precio: 2000, foto: null, categoria: "Bebidas", stock: 0 },
      { id: 2, nombre: "Gaseosa", precio: 2500, foto: "https://proyecto.supabase.co/storage/v1/object/public/productos/2/1.webp", categoria: "Bebidas", stock: 7 },
      { id: 1, nombre: "Tinto", precio: 1500, foto: null, categoria: "Cafetería", stock: null },
    ]);
  });

  test("sin categoría va primero, sin encabezado", () => {
    expect(productosEnVenta([{ ...fila, id: 1, nombre: "Suelto", precio: 100, categorias: null }, { ...fila, id: 2, nombre: "Agua", precio: 100 }], []).map((p) => p.categoria)).toEqual([
      "",
      "Bebidas",
    ]);
  });

  test("un stock sin valor es 0", () => {
    expect(productosEnVenta([{ ...fila, id: 1, nombre: "Agua", precio: 100 }], [{ producto_id: 1, stock: null }])[0].stock).toBe(0);
  });
});
