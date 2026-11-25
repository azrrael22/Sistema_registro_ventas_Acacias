import { describe, expect, test } from "vitest";
import { leerRetiro, montoRetiro } from "@/lib/retiros";
import { formulario } from "@/test/formularios";

describe("montoRetiro", () => {
  test.each([["1", 1], ["50000", 50000], [" 20000 ", 20000]])("«%s» son %s pesos", (texto, monto) => {
    expect(montoRetiro(texto)).toBe(monto);
  });

  // COP sin decimales: lo mismo que exige el campo (step=1)
  test.each(["", "  ", "0", "-5000", "1500.5", "abc", "Infinity"])("«%s» no es un monto", (texto) => {
    expect(montoRetiro(texto)).toBeNull();
  });
});

describe("leerRetiro", () => {
  test("categoría, monto y nota", () => {
    expect(leerRetiro(formulario({ categoria_id: "3", monto: "20000", nota: " para el proveedor " }))).toEqual({
      categoria_id: 3,
      monto: 20000,
      nota: "para el proveedor",
    });
  });

  test("sin nota, la nota es null", () => {
    expect(leerRetiro(formulario({ categoria_id: "3", monto: "20000" }))).toEqual({ categoria_id: 3, monto: 20000, nota: null });
  });

  test.each(["0", "1500.5", ""])("un monto «%s» no se retira", (monto) => {
    expect(leerRetiro(formulario({ categoria_id: "3", monto }))).toEqual({ error: "El monto debe ser un número entero mayor que 0" });
  });
});
