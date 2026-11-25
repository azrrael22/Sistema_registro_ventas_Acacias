import { describe, expect, test } from "vitest";
import { documento, leerDocumento } from "@/lib/documentos";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("leerDocumento", () => {
  test.each([
    ["sin tipo", {}],
    ["con un tipo que no existe", { tipo_documento: "NIT", numero_documento: "900123456" }],
  ])("%s pide elegir el tipo", (_, campos) => {
    expect(leerDocumento(form(campos))).toEqual({ error: "Elige el tipo de documento" });
  });

  test("la cédula se guarda sin puntos, espacios ni guiones", () => {
    expect(leerDocumento(form({ tipo_documento: "CC", numero_documento: " 1.032.456-789 " }))).toEqual({ tipo: "CC", numero: "1032456789" });
  });

  test.each(["12345", "123456789012"])("la tarjeta de identidad acepta %s (de 5 a 12 dígitos)", (numero) => {
    expect(leerDocumento(form({ tipo_documento: "TI", numero_documento: numero }))).toEqual({ tipo: "TI", numero });
  });

  test.each(["1234", "1234567890123", "12345A", ""])("una cédula «%s» no es válida", (numero) => {
    expect(leerDocumento(form({ tipo_documento: "CC", numero_documento: numero }))).toEqual({
      error: "El número de documento debe tener entre 5 y 12 dígitos",
    });
  });

  test("sin número, la cédula no es válida", () => {
    expect(leerDocumento(form({ tipo_documento: "CC" }))).toEqual({ error: "El número de documento debe tener entre 5 y 12 dígitos" });
  });

  test("el pasaporte admite letras y se guarda en mayúsculas", () => {
    expect(leerDocumento(form({ tipo_documento: "Pasaporte", numero_documento: "ab 123-45" }))).toEqual({
      tipo: "Pasaporte",
      numero: "AB12345",
    });
  });

  test.each(["AB12", "A".repeat(21), "AB12345Ñ"])("un pasaporte «%s» no es válido", (numero) => {
    expect(leerDocumento(form({ tipo_documento: "Pasaporte", numero_documento: numero }))).toEqual({
      error: "El pasaporte debe tener entre 5 y 20 letras o números",
    });
  });

  test("un pasaporte de 20 caracteres sí es válido", () => {
    expect(leerDocumento(form({ tipo_documento: "Pasaporte", numero_documento: "A".repeat(20) }))).toEqual({
      tipo: "Pasaporte",
      numero: "A".repeat(20),
    });
  });
});

describe("documento", () => {
  test("la cédula se muestra con puntos de miles", () => {
    expect(documento("CC", "1032456789")).toBe("CC 1.032.456.789");
    expect(documento("TI", "12345")).toBe("TI 12.345");
    expect(documento("CC", "123")).toBe("CC 123");
  });

  test("el pasaporte se muestra tal cual", () => {
    expect(documento("Pasaporte", "AB123456")).toBe("Pasaporte AB123456");
  });
});
