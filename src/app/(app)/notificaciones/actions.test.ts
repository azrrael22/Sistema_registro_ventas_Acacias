import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { Redireccion } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { abrirNotificacion, marcarTodasLeidas } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe("marcarTodasLeidas", () => {
  test("marca las no leídas", async () => {
    const supabase = usarSupabase();
    expect(await marcarTodasLeidas()).toBeUndefined();
    expect(supabase.pedidos("from:notificaciones")).toEqual([
      [
        ["from", "notificaciones"],
        ["update", { leida: true }],
        ["eq", "leida", false],
      ],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("si la base de datos falla, se dice", async () => {
    usarSupabase({ "from:notificaciones": { error: { code: "57014", message: "timeout" } } });
    expect(await marcarTodasLeidas()).toEqual({ error: "La base de datos tardó demasiado en responder y no se guardó nada. Inténtalo de nuevo." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("abrirNotificacion", () => {
  test("la marca como leída y lleva a su pantalla, la de la fila guardada", async () => {
    const supabase = usarSupabase({ "from:notificaciones": { data: { tipo: "nuevo_socio", datos: { categoria_id: 4 } } } });
    await expect(abrirNotificacion(undefined, formulario({ id: "12", destino: "https://otro.com" }))).rejects.toEqual(
      new Redireccion("/productos?categoria=4"),
    );
    expect(supabase.pedidos("from:notificaciones")).toEqual([
      [["from", "notificaciones"], ["update", { leida: true }], ["eq", "id", 12], ["select", "tipo, datos"], ["maybeSingle"]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("una notificación sin pantalla propia (o ajena) lleva a la lista", async () => {
    usarSupabase({ "from:notificaciones": { data: null } });
    await expect(abrirNotificacion(undefined, formulario({ id: "12" }))).rejects.toEqual(new Redireccion("/notificaciones"));
  });

  test("si la base de datos falla, se dice y no se sale de la lista", async () => {
    usarSupabase({ "from:notificaciones": { error: { message: "fetch failed" } } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await abrirNotificacion(undefined, formulario({ id: "12" }))).toEqual({
      error: "No se pudo conectar con la base de datos, así que no se guardó nada. Inténtalo de nuevo en un momento.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
