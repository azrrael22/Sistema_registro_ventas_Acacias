import { describe, expect, test } from "vitest";
import { rutaInterna } from "@/lib/rutas";

describe("rutaInterna", () => {
  test.each([
    ["/ventas", "/ventas"],
    ["/reportes?g=mes&x=1", "/reportes?g=mes&x=1"],
    ["/notificaciones/12#arriba", "/notificaciones/12"],
    ["/a/../ventas", "/ventas"],
  ])("%s es una ruta de la app → %s", (valor, ruta) => {
    expect(rutaInterna(valor)).toBe(ruta);
  });

  test.each([
    ["otro sitio con //", "//otro.com/login"],
    ["otro sitio con /\\", "/\\otro.com"],
    ["una URL completa", "https://otro.com"],
    ["una ruta relativa", "ventas"],
    ["vacío", ""],
    ["una URL que no se puede leer", "//["],
  ])("%s no es una ruta de la app", (_, valor) => {
    expect(rutaInterna(valor)).toBeNull();
  });

  test.each([null, undefined, 42, ["/ventas"]])("%o no es una ruta", (valor) => {
    expect(rutaInterna(valor)).toBeNull();
  });
});
