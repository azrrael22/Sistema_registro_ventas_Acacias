import { describe, expect, test } from "vitest";
import { leerContrasenaNueva } from "@/lib/contrasenas";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("leerContrasenaNueva", () => {
  test("una contraseña de 8 caracteres confirmada", () => {
    expect(leerContrasenaNueva(form({ password: "12345678", confirmar: "12345678" }))).toEqual({ password: "12345678" });
  });

  test.each([["corta", { password: "1234567", confirmar: "1234567" }], ["ausente", {}]])("una contraseña %s no sirve", (_, campos) => {
    expect(leerContrasenaNueva(form(campos))).toEqual({ error: "La contraseña debe tener al menos 8 caracteres" });
  });

  test.each([["distinta", { password: "12345678", confirmar: "12345679" }], ["sin confirmar", { password: "12345678" }]])(
    "una confirmación %s no coincide",
    (_, campos) => {
      expect(leerContrasenaNueva(form(campos))).toEqual({ error: "Las contraseñas no coinciden" });
    },
  );
});
