import { beforeEach, describe, expect, test, vi } from "vitest";
import { Redireccion } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { GET } from "./route";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// Abre el enlace «Ver en la app» del correo de la notificación `id`
const abrir = (id: string) => GET(new Request(`https://acacias.test/notificaciones/${id}`), { params: Promise.resolve({ id }) });

describe("GET /notificaciones/[id]", () => {
  test("marca la notificación como leída y lleva a su pantalla", async () => {
    const supabase = usarSupabase({ "from:notificaciones": { data: { tipo: "retiro", datos: null } } });
    await expect(abrir("12")).rejects.toEqual(new Redireccion("/retiros"));
    expect(supabase.pedidos("from:notificaciones")[0]).toContainEqual(["eq", "id", 12]);
  });

  test("el primer id también es una notificación", async () => {
    const supabase = usarSupabase({ "from:notificaciones": { data: { tipo: "cuenta_aprobada", datos: null } } });
    await expect(abrir("1")).rejects.toEqual(new Redireccion("/ventas/nueva"));
    expect(supabase.pedidos("from:notificaciones")[0]).toContainEqual(["eq", "id", 1]);
  });

  test.each(["0", "-3", "abc", "1.5", "99999999999999999999"])("un id «%s» no se busca", async (id) => {
    const supabase = usarSupabase();
    await expect(abrir(id)).rejects.toEqual(new Redireccion("/notificaciones"));
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos falla, lleva a la lista y lo registra", async () => {
    const error = { message: "fetch failed" };
    usarSupabase({ "from:notificaciones": { error } });
    await expect(abrir("12")).rejects.toEqual(new Redireccion("/notificaciones"));
    expect(console.error).toHaveBeenCalledWith("No se pudo abrir la notificación del correo:", error);
  });
});
