import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { usarSupabase } from "@/test/supabase-falso";
import { registrarRetiro } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe("registrarRetiro", () => {
  test("registra el retiro y avisa que se notificó a los socios", async () => {
    const supabase = usarSupabase();
    const resultado = await registrarRetiro(undefined, formulario({ categoria_id: "3", monto: "20000", nota: " proveedor " }));
    expect(resultado).toEqual({ ok: "Retiro registrado. Se notificó a los demás socios." });
    expect(supabase.pedidos("from:retiros")).toEqual([
      [
        ["from", "retiros"],
        ["insert", { categoria_id: 3, monto: 20000, nota: "proveedor" }],
      ],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test.each(["0", "1500.5"])("un monto de «%s» no llega a la base de datos (pesos enteros, igual que en el campo)", async (monto) => {
    const supabase = usarSupabase();
    expect(await registrarRetiro(undefined, formulario({ categoria_id: "3", monto }))).toEqual({
      error: "El monto debe ser un número entero mayor que 0",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué y no se refresca nada", async () => {
    usarSupabase({ "from:retiros": { error: { code: "P0001", message: "El retiro supera el saldo de la categoría" } } });
    expect(await registrarRetiro(undefined, formulario({ categoria_id: "3", monto: "900000" }))).toEqual({
      error: "El retiro supera el saldo de la categoría",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
