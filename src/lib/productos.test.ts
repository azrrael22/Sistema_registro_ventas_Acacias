import { describe, expect, test } from "vitest";
import { leerCambiosProducto, leerProductoNuevo } from "@/lib/productos";
import { formulario } from "@/test/formularios";

describe("leerProductoNuevo", () => {
  test("nombre recortado, precio, categoría e inventario", () => {
    expect(leerProductoNuevo(formulario({ nombre: "  Gaseosa  ", precio: "2500", categoria_id: "4", maneja_inventario: "on" }))).toEqual({
      nombre: "Gaseosa",
      precio: 2500,
      categoria_id: 4,
      maneja_inventario: true,
    });
  });

  test("el precio más bajo es 1 peso", () => {
    expect(leerProductoNuevo(formulario({ nombre: "Dulce", precio: "1", categoria_id: "4" }))).toMatchObject({ precio: 1 });
  });

  test("sin la casilla, no lleva inventario", () => {
    expect(leerProductoNuevo(formulario({ nombre: "Tinto", precio: "1000", categoria_id: "4" }))).toMatchObject({ maneja_inventario: false });
  });

  test.each([["vacío", { nombre: "  " }], ["ausente", {}]])("un nombre %s no sirve", (_, campos) => {
    expect(leerProductoNuevo(formulario({ precio: "1000", categoria_id: "4", ...campos }))).toEqual({ error: "Escribe el nombre del producto" });
  });

  test.each(["0", "-100", "abc", ""])("un precio «%s» no sirve para crear", (precio) => {
    expect(leerProductoNuevo(formulario({ nombre: "Tinto", precio, categoria_id: "4" }))).toEqual({ error: "El precio debe ser mayor que 0" });
  });
});

describe("leerCambiosProducto", () => {
  const cambios = (campos: Record<string, string>) => leerCambiosProducto(formulario({ id: "9", nombre: "Tinto", ...campos }));

  test("id, nombre, precio, activo e inventario", () => {
    expect(cambios({ nombre: " Tinto grande ", precio: "1500", activo: "on", maneja_inventario: "on" })).toEqual({
      id: 9,
      datos: { nombre: "Tinto grande", precio: 1500, activo: true, maneja_inventario: true },
    });
  });

  test("un producto inactivo puede quedar en 0", () => {
    expect(cambios({ precio: "0" })).toEqual({ id: 9, datos: { nombre: "Tinto", precio: 0, activo: false, maneja_inventario: false } });
  });

  test("un producto activo necesita precio", () => {
    expect(cambios({ precio: "0", activo: "on" })).toEqual({ error: "Asigna un precio antes de activar el producto" });
  });

  test.each(["-1", "abc", ""])("un precio «%s» no sirve", (precio) => {
    expect(cambios({ precio })).toEqual({ error: "Precio inválido" });
  });

  test("sin nombre no se guarda", () => {
    expect(cambios({ nombre: " ", precio: "1000" })).toEqual({ error: "Escribe el nombre del producto" });
  });
});
