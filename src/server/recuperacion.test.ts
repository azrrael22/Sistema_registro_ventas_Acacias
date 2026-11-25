import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { galletas } from "@/test/next";
import { enRecuperacion, marcarRecuperacion, terminarRecuperacion } from "@/server/recuperacion";

vi.mock("next/headers", async () => (await import("@/test/next")).moduloHeaders);

beforeEach(() => {
  galletas.clear();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cookie de recuperación", () => {
  test("dura 15 minutos, solo la lee el servidor", async () => {
    await marcarRecuperacion("empleado-1");
    expect(galletas.get("recuperacion")).toEqual({
      value: "empleado-1",
      opciones: { httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 900 },
    });
  });

  test("en producción solo viaja por HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await marcarRecuperacion("empleado-1");
    expect(galletas.get("recuperacion")?.opciones).toMatchObject({ secure: true });
  });

  test("vale solo para el usuario que abrió el enlace", async () => {
    await marcarRecuperacion("empleado-1");
    expect(await enRecuperacion("empleado-1")).toBe(true);
    expect(await enRecuperacion("empleado-2")).toBe(false);
    expect(await enRecuperacion(undefined)).toBe(false);
  });

  test("sin la cookie no hay recuperación", async () => {
    expect(await enRecuperacion("empleado-1")).toBe(false);
  });

  test("se borra al terminar", async () => {
    await marcarRecuperacion("empleado-1");
    await terminarRecuperacion();
    expect(await enRecuperacion("empleado-1")).toBe(false);
  });
});
