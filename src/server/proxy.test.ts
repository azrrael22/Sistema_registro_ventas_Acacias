import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/server/proxy";

type Galleta = { name: string; value: string; options?: object };
type Cookies = { getAll: () => Galleta[]; setAll: (galletas: Galleta[], headers: Record<string, string>) => void };

// getClaims() de la sesión: puede renovar las cookies (setAll), como hace @supabase/ssr
let conSesion = false;
let renovadas: Galleta[] | null = null;
let leidas: Galleta[] = [];

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _clave: string, { cookies }: { cookies: Cookies }) => ({
    auth: {
      getClaims: async () => {
        leidas = cookies.getAll();
        if (renovadas) cookies.setAll(renovadas, { "cache-control": "private, no-store" });
        return { data: conSesion ? { claims: { sub: "empleado-1" } } : null, error: null };
      },
    },
  }),
}));

beforeEach(() => {
  conSesion = false;
  renovadas = null;
  leidas = [];
});

const pedir = (ruta: string) =>
  updateSession(new NextRequest(`https://acacias.test${ruta}`, { headers: { cookie: "sb-token=viejo" } }));
const destino = async (ruta: string) => (await pedir(ruta)).headers.get("location");

describe("sin sesión", () => {
  test("una pantalla interna manda al login con el destino para volver", async () => {
    expect(await destino("/notificaciones/12?x=1&_rsc=abc")).toBe("https://acacias.test/login?destino=%2Fnotificaciones%2F12%3Fx%3D1");
  });

  test("desde el inicio no hace falta destino", async () => {
    expect(await destino("/")).toBe("https://acacias.test/login");
  });

  test("una ruta sin query lleva solo la ruta", async () => {
    expect(await destino("/ventas?_rsc=abc")).toBe("https://acacias.test/login?destino=%2Fventas");
  });

  test.each(["/login", "/registro", "/recuperar", "/auth/callback?code=abc"])("%s es pública", async (ruta) => {
    const respuesta = await pedir(ruta);
    expect(respuesta.headers.get("location")).toBeNull();
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });

  test("/restablecer no es pública: necesita la sesión del enlace", async () => {
    expect(await destino("/restablecer")).toBe("https://acacias.test/login?destino=%2Frestablecer");
  });
});

describe("con sesión", () => {
  beforeEach(() => {
    conSesion = true;
  });

  test("las pantallas internas siguen", async () => {
    const respuesta = await pedir("/ventas");
    expect(respuesta.headers.get("location")).toBeNull();
    expect(leidas).toEqual([{ name: "sb-token", value: "viejo" }]);
  });

  test.each(["/login", "/registro"])("%s lleva a donde iba", async (ruta) => {
    expect(await destino(`${ruta}?destino=/retiros`)).toBe("https://acacias.test/retiros");
    expect(await destino(ruta)).toBe("https://acacias.test/");
    expect(await destino(`${ruta}?destino=//otro.com`)).toBe("https://acacias.test/");
  });

  test("/recuperar sigue siendo accesible", async () => {
    expect(await destino("/recuperar")).toBeNull();
  });
});

describe("cookies renovadas", () => {
  test("la respuesta lleva las cookies y los headers que dejó getClaims()", async () => {
    conSesion = true;
    renovadas = [{ name: "sb-token", value: "nuevo", options: { path: "/" } }];
    const respuesta = await pedir("/ventas");
    expect(respuesta.cookies.get("sb-token")?.value).toBe("nuevo");
    expect(respuesta.headers.get("cache-control")).toBe("private, no-store");
  });

  test("la redirección al login también, para no perder la sesión borrada", async () => {
    renovadas = [{ name: "sb-token", value: "", options: { maxAge: 0 } }];
    const respuesta = await pedir("/ventas");
    expect(respuesta.headers.get("location")).toBe("https://acacias.test/login?destino=%2Fventas");
    expect(respuesta.cookies.get("sb-token")?.value).toBe("");
  });
});
