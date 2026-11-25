import { describe, expect, test } from "vitest";
import { leerMovimiento, mensajeConteo } from "@/lib/inventario";
import { formulario } from "@/test/formularios";

const movimiento = (campos: Record<string, string>) => leerMovimiento(formulario({ producto_id: "7", ...campos }));

describe("leerMovimiento: conteo físico", () => {
  test.each(["0", "12"])("cuenta %s unidades", (cantidad) => {
    expect(movimiento({ tipo: "conteo", cantidad, nota: " " })).toEqual({ tipo: "conteo", producto_id: 7, contadas: Number(cantidad), nota: null });
  });

  test.each(["-1", "2.5", "", "abc"])("«%s» no es un conteo", (cantidad) => {
    expect(movimiento({ tipo: "conteo", cantidad })).toEqual({ error: "Escribe cuántas unidades contaste (0 o más)" });
  });
});

describe("leerMovimiento: entrada y ajuste", () => {
  test("una entrada positiva, con nota", () => {
    expect(movimiento({ tipo: "entrada", cantidad: "24", nota: " pedido del lunes " })).toEqual({
      tipo: "entrada",
      producto_id: 7,
      cantidad: 24,
      nota: "pedido del lunes",
    });
  });

  test("sin tipo es una entrada", () => {
    expect(movimiento({ cantidad: "3" })).toEqual({ tipo: "entrada", producto_id: 7, cantidad: 3, nota: null });
  });

  test("un ajuste puede restar", () => {
    expect(movimiento({ tipo: "ajuste", cantidad: "-2" })).toEqual({ tipo: "ajuste", producto_id: 7, cantidad: -2, nota: null });
  });

  test("una entrada no puede restar", () => {
    expect(movimiento({ tipo: "entrada", cantidad: "-2" })).toEqual({ error: "Una entrada debe ser positiva. Usa un ajuste para restar." });
  });

  test.each([
    ["entrada", "0"],
    ["ajuste", "0"],
    ["ajuste", "1.5"],
    ["entrada", ""],
  ])("un %s de «%s» no es válido", (tipo, cantidad) => {
    expect(movimiento({ tipo, cantidad })).toEqual({ error: "La cantidad debe ser un número entero distinto de 0" });
  });
});

describe("mensajeConteo", () => {
  test.each([
    [0, "El conteo cuadra con el sistema"],
    [-1, "Falta 1 unidad: queda registrada como perdida"],
    [-3, "Faltan 3 unidades: quedan registradas como perdidas"],
    [1, "Sobra 1 unidad: se sumó al stock"],
    [4, "Sobran 4 unidades: se sumaron al stock"],
  ])("diferencia %s → «%s»", (diferencia, mensaje) => {
    expect(mensajeConteo(diferencia)).toBe(mensaje);
  });
});
