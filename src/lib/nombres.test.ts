import { describe, expect, test } from "vitest";
import { faltanApellidos, leerNombres } from "@/lib/nombres";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};
const completo = { primer_nombre: "Ana", segundo_nombre: "María", primer_apellido: "Rojas", segundo_apellido: "Díaz" };

describe("leerNombres", () => {
  test("quita los espacios sobrantes de cada parte", () => {
    expect(
      leerNombres(form({ primer_nombre: "  Ana  ", segundo_nombre: " María   José ", primer_apellido: "De  la Rosa", segundo_apellido: "Díaz " })),
    ).toEqual({ primer_nombre: "Ana", segundo_nombre: "María José", primer_apellido: "De la Rosa", segundo_apellido: "Díaz" });
  });

  test.each([["vacío", "   "], ["ausente", null]])("el segundo nombre %s se guarda como null", (_, valor) => {
    const campos: Record<string, string> = { ...completo };
    if (valor === null) delete campos.segundo_nombre;
    else campos.segundo_nombre = valor;
    expect(leerNombres(form(campos))).toEqual({ ...completo, segundo_nombre: null });
  });

  test.each([
    ["primer_nombre", "Escribe tu primer nombre"],
    ["primer_apellido", "Escribe tu primer apellido"],
    ["segundo_apellido", "Escribe tu segundo apellido"],
  ])("sin %s pide escribirlo", (campo, error) => {
    expect(leerNombres(form({ ...completo, [campo]: "  " }))).toEqual({ error });
  });

  test.each(["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido"])("%s admite hasta 40 caracteres", (campo) => {
    expect(leerNombres(form({ ...completo, [campo]: "a".repeat(40) }))).toEqual({ ...completo, [campo]: "a".repeat(40) });
    expect(leerNombres(form({ ...completo, [campo]: "a".repeat(41) }))).toEqual({
      error: "Cada nombre y apellido puede tener hasta 40 caracteres",
    });
  });
});

describe("faltanApellidos", () => {
  test.each([
    [{ primer_apellido: "Rojas", segundo_apellido: "Díaz" }, false],
    [{ primer_apellido: null, segundo_apellido: "Díaz" }, true],
    [{ primer_apellido: "Rojas", segundo_apellido: null }, true],
    [{ primer_apellido: "", segundo_apellido: "Díaz" }, true],
  ])("%o → %s", (empleado, faltan) => {
    expect(faltanApellidos(empleado)).toBe(faltan);
  });
});
