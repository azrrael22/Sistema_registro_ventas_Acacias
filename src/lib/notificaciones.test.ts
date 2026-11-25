import { describe, expect, test } from "vitest";
import { destinoNotificacion } from "@/lib/notificaciones";

describe("destinoNotificacion", () => {
  test.each([
    ["retiro", "/retiros"],
    ["registro_pendiente", "/admin/empleados"],
    ["cuenta_aprobada", "/ventas/nueva"],
  ])("«%s» lleva a %s", (tipo, destino) => {
    expect(destinoNotificacion(tipo, null)).toBe(destino);
  });

  test("un socio nuevo lleva a su categoría", () => {
    expect(destinoNotificacion("nuevo_socio", { categoria_id: 7 })).toBe("/productos?categoria=7");
  });

  test.each([
    ["sin datos", null],
    ["sin categoría", { otra: 1 }],
    ["con la categoría como texto", { categoria_id: "7" }],
    ["con una lista", [7]],
    ["con un número suelto", 7],
  ])("un socio nuevo %s lleva a Productos", (_, datos) => {
    expect(destinoNotificacion("nuevo_socio", datos)).toBe("/productos");
  });

  test("un tipo sin pantalla propia no lleva a ninguna", () => {
    expect(destinoNotificacion("otro", { categoria_id: 7 })).toBeNull();
  });
});
