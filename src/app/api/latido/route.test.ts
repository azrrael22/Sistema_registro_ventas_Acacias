import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { usarSupabase } from "@/test/supabase-falso";
import { GET } from "./route";

// Argumentos con que la ruta crea su cliente de Supabase
const creados: unknown[][] = [];
vi.mock("@supabase/supabase-js", async () => {
  const { supabaseActual } = await import("@/test/supabase-falso");
  return {
    createClient: (...args: unknown[]) => {
      creados.push(args);
      return supabaseActual();
    },
  };
});

beforeEach(() => {
  creados.length = 0;
  vi.stubEnv("CRON_SECRET", "secreto-del-cron");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proyecto.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const latido = (authorization?: string) =>
  GET(new Request("https://acacias.test/api/latido", { headers: authorization ? { authorization } : {} }));

describe("GET /api/latido", () => {
  test("con el secreto del Cron, consulta la base de datos para que no se pause", async () => {
    const supabase = usarSupabase({ "rpc:latido": { data: "2026-11-25T12:00:00Z" } });
    const respuesta = await latido("Bearer secreto-del-cron");
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, hora: "2026-11-25T12:00:00Z" });
    expect(supabase.orden()).toEqual(["rpc:latido"]);
    // Sin sesión: el Cron no inicia sesión ni guarda nada entre llamadas
    expect(creados).toEqual([
      ["https://proyecto.supabase.co", "sb_publishable_x", { auth: { persistSession: false, autoRefreshToken: false } }],
    ]);
  });

  test.each([
    ["sin Authorization", undefined],
    ["con otro secreto", "Bearer otro"],
    ["sin Bearer", "secreto-del-cron"],
  ])("%s no está autorizado", async (_, authorization) => {
    const supabase = usarSupabase();
    const respuesta = await latido(authorization);
    expect(respuesta.status).toBe(401);
    expect(await respuesta.json()).toEqual({ ok: false, error: "No autorizado" });
    expect(supabase.orden()).toEqual([]);
  });

  test("sin CRON_SECRET configurado, nadie está autorizado", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await latido("Bearer ")).status).toBe(401);
  });

  test("si la base de datos falla, responde 500 y lo registra", async () => {
    usarSupabase({ "rpc:latido": { error: { message: "fetch failed" } } });
    const respuesta = await latido("Bearer secreto-del-cron");
    expect(respuesta.status).toBe(500);
    expect(await respuesta.json()).toEqual({ ok: false, error: "fetch failed" });
    expect(console.error).toHaveBeenCalledWith("Latido fallido:", "fetch failed");
  });
});
