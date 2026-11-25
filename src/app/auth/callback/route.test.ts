import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { galletas } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { GET } from "./route";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("next/headers", async () => (await import("@/test/next")).moduloHeaders);

beforeEach(() => {
  galletas.clear();
});

// Abre el enlace de un correo de Auth y devuelve a dónde redirige
const abrir = async (query: string) => {
  const respuesta = await GET(new NextRequest(`https://acacias.test/auth/callback?${query}`));
  expect(respuesta.status).toBe(307);
  return respuesta.headers.get("location");
};
const usuario = { data: { user: { id: "empleado-1" } } };
const vencido = { error: { message: "Email link is invalid or has expired", code: "otp_expired", status: 403 } };

describe("GET /auth/callback", () => {
  test("confirma el registro con el código y entra a la app", async () => {
    const supabase = usarSupabase({ "auth.exchangeCodeForSession": usuario });
    expect(await abrir("code=abc")).toBe("https://acacias.test/");
    expect(supabase.pedidos("auth.exchangeCodeForSession")).toEqual([[["exchangeCodeForSession", "abc"]]]);
  });

  test("el cambio de correo vuelve a Mi perfil", async () => {
    usarSupabase({ "auth.exchangeCodeForSession": usuario });
    expect(await abrir("code=abc&next=/perfil")).toBe("https://acacias.test/perfil");
  });

  test("un next de otro sitio lleva al inicio", async () => {
    usarSupabase({ "auth.exchangeCodeForSession": usuario });
    expect(await abrir("code=abc&next=//otro.com")).toBe("https://acacias.test/");
  });

  test("el primer enlace del cambio de correo solo trae un mensaje: no abre sesión", async () => {
    const supabase = usarSupabase();
    expect(await abrir("message=Confirma+el+otro+enlace&next=/perfil")).toBe("https://acacias.test/perfil");
    expect(supabase.orden()).toEqual([]);
  });

  describe("recuperar la contraseña", () => {
    test("con la plantilla propia (token_hash), deja la cookie y lleva a /restablecer", async () => {
      const supabase = usarSupabase({ "auth.verifyOtp": usuario });
      expect(await abrir("token_hash=th&type=recovery")).toBe("https://acacias.test/restablecer");
      expect(supabase.pedidos("auth.verifyOtp")).toEqual([[["verifyOtp", { token_hash: "th", type: "recovery" }]]]);
      expect(galletas.get("recuperacion")?.value).toBe("empleado-1");
    });

    test("con el código PKCE y next=/restablecer, igual", async () => {
      usarSupabase({ "auth.exchangeCodeForSession": usuario });
      expect(await abrir("code=abc&next=/restablecer")).toBe("https://acacias.test/restablecer");
      expect(galletas.get("recuperacion")?.value).toBe("empleado-1");
    });

    test("sin usuario en la respuesta no deja la cookie", async () => {
      usarSupabase({ "auth.verifyOtp": { data: { user: null } } });
      expect(await abrir("token_hash=th&type=recovery")).toBe("https://acacias.test/");
      expect(galletas.has("recuperacion")).toBe(false);
    });

    test("un enlace vencido vuelve a pedir el correo", async () => {
      usarSupabase({ "auth.verifyOtp": vencido });
      expect(await abrir("token_hash=th&type=recovery")).toBe("https://acacias.test/recuperar?error=enlace");
      expect(galletas.has("recuperacion")).toBe(false);
    });
  });

  test("otro tipo de enlace con token_hash no deja la cookie", async () => {
    usarSupabase({ "auth.verifyOtp": usuario });
    expect(await abrir("token_hash=th&type=signup")).toBe("https://acacias.test/");
    expect(galletas.has("recuperacion")).toBe(false);
  });

  test("un enlace de cambio de correo vencido vuelve a Mi perfil", async () => {
    usarSupabase({ "auth.exchangeCodeForSession": vencido });
    expect(await abrir("code=abc&next=/perfil")).toBe("https://acacias.test/perfil?error=enlace");
  });

  test("un enlace de registro vencido lleva al login", async () => {
    usarSupabase({ "auth.exchangeCodeForSession": vencido });
    expect(await abrir("code=abc")).toBe("https://acacias.test/login?error=enlace");
  });

  test.each([["sin código ni token", ""], ["con token_hash pero sin type", "token_hash=th"]])("un enlace %s no es válido", async (_, query) => {
    const supabase = usarSupabase();
    expect(await abrir(query)).toBe("https://acacias.test/login?error=enlace");
    expect(supabase.orden()).toEqual([]);
  });
});
