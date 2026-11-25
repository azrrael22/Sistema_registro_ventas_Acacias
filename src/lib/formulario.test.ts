import { describe, expect, test } from "vitest";
import { numero, texto, textoOpcional } from "@/lib/formulario";
import { formulario } from "@/test/formularios";

describe("texto", () => {
  test("el valor del campo tal cual, sin recortar (las contraseñas no se recortan)", () => {
    expect(texto(formulario({ password: " clave " }), "password")).toBe(" clave ");
  });

  test("un campo ausente es vacío, no «null»", () => {
    expect(texto(formulario({}), "nombre")).toBe("");
  });
});

describe("textoOpcional", () => {
  test("se recorta", () => {
    expect(textoOpcional(formulario({ nota: "  pagó con billete de 50  " }), "nota")).toBe("pagó con billete de 50");
  });

  test.each([["vacío", { nota: "   " }], ["ausente", {}]])("un campo %s es null", (_, campos) => {
    expect(textoOpcional(formulario(campos), "nota")).toBeNull();
  });
});

describe("numero", () => {
  test.each([["12", 12], [" -3 ", -3], ["2.5", 2.5], ["0", 0]])("«%s» es %s", (valor, n) => {
    expect(numero(formulario({ cantidad: valor }), "cantidad")).toBe(n);
  });

  test.each([["vacío", { cantidad: "  " }], ["ausente", {}], ["con letras", { cantidad: "doce" }]])("un campo %s no es un número", (_, campos) => {
    expect(numero(formulario(campos), "cantidad")).toBeNaN();
  });
});
