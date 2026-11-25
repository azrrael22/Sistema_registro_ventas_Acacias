import { describe, expect, test } from "vitest";
import { leerDevolucion, validarItemsVenta } from "@/lib/ventas";
import { formulario } from "@/test/formularios";

describe("validarItemsVenta", () => {
  test("se quedan solo las cantidades enteras mayores que 0", () => {
    expect(
      validarItemsVenta([
        { producto_id: 1, cantidad: 2 },
        { producto_id: 2, cantidad: 0 },
        { producto_id: 3, cantidad: 1.5 },
        { producto_id: 4, cantidad: -1 },
        { producto_id: 5, cantidad: 1, precio_unitario: 0 },
      ]),
    ).toEqual({
      items: [
        { producto_id: 1, cantidad: 2 },
        { producto_id: 5, cantidad: 1, precio_unitario: 0 },
      ],
    });
  });

  test("sin productos no hay venta", () => {
    expect(validarItemsVenta([])).toEqual({ error: "Agrega al menos un producto" });
    expect(validarItemsVenta([{ producto_id: 1, cantidad: 0 }])).toEqual({ error: "Agrega al menos un producto" });
  });

  test.each([-1, NaN, Infinity])("un precio de %s no es válido", (precio_unitario) => {
    expect(validarItemsVenta([{ producto_id: 1, cantidad: 1, precio_unitario }])).toEqual({ error: "Precio inválido" });
  });

  test("el precio de un producto descartado no importa", () => {
    expect(validarItemsVenta([{ producto_id: 1, cantidad: 1 }, { producto_id: 2, cantidad: 0, precio_unitario: -1 }])).toEqual({
      items: [{ producto_id: 1, cantidad: 1 }],
    });
  });
});

describe("leerDevolucion", () => {
  test("las unidades devueltas de cada producto", () => {
    expect(leerDevolucion(formulario({ venta_id: "31", cantidad_4: "2", cantidad_9: "0", cantidad_12: "1", nota: "venía dañada" }))).toEqual({
      venta_id: 31,
      items: [
        { producto_id: 4, cantidad: 2 },
        { producto_id: 12, cantidad: 1 },
      ],
      nota: "venía dañada",
    });
  });

  test("sin nota, la nota es vacía (como se guardaba)", () => {
    expect(leerDevolucion(formulario({ venta_id: "31", cantidad_4: "1" }))).toMatchObject({ nota: "" });
  });

  test("otros campos no son productos", () => {
    expect(leerDevolucion(formulario({ venta_id: "31", cantidad_4: "1", otro_5: "3" }))).toMatchObject({ items: [{ producto_id: 4, cantidad: 1 }] });
  });

  test.each([["sin unidades", { cantidad_4: "0" }], ["con cantidades negativas", { cantidad_4: "-1" }], ["vacía", {}]])(
    "una devolución %s no sirve",
    (_, campos) => {
      expect(leerDevolucion(formulario({ venta_id: "31", ...campos }))).toEqual({ error: "Indica cuántas unidades se devuelven" });
    },
  );
});
