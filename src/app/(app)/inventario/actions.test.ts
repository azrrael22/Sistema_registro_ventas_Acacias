import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { usarSupabase } from "@/test/supabase-falso";
import { registrarMovimiento } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

const enviar = (campos: Record<string, string>) => registrarMovimiento(undefined, formulario({ producto_id: "7", ...campos }));

describe("registrarMovimiento: entrada y ajuste", () => {
  test("una entrada se guarda como movimiento", async () => {
    const supabase = usarSupabase();
    expect(await enviar({ tipo: "entrada", cantidad: "24", nota: " pedido " })).toEqual({ ok: "Movimiento registrado" });
    expect(supabase.pedidos("from:inventario_movimientos")).toEqual([
      [
        ["from", "inventario_movimientos"],
        ["insert", { producto_id: 7, tipo: "entrada", cantidad: 24, nota: "pedido" }],
      ],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("un ajuste puede restar", async () => {
    const supabase = usarSupabase();
    expect(await enviar({ tipo: "ajuste", cantidad: "-2" })).toEqual({ ok: "Movimiento registrado" });
    expect(supabase.pedidos("from:inventario_movimientos")[0][1]).toEqual(["insert", { producto_id: 7, tipo: "ajuste", cantidad: -2, nota: null }]);
  });

  test("una entrada negativa no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await enviar({ tipo: "entrada", cantidad: "-2" })).toEqual({ error: "Una entrada debe ser positiva. Usa un ajuste para restar." });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "from:inventario_movimientos": { error: { code: "P0001", message: "Gaseosa no lleva inventario" } } });
    expect(await enviar({ tipo: "entrada", cantidad: "5" })).toEqual({ error: "Gaseosa no lleva inventario" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("registrarMovimiento: conteo físico", () => {
  test("envía lo contado y dice la diferencia", async () => {
    const supabase = usarSupabase({ "rpc:registrar_conteo": { data: -3 } });
    expect(await enviar({ tipo: "conteo", cantidad: "9", nota: "conteo del viernes" })).toEqual({
      ok: "Faltan 3 unidades: quedan registradas como perdidas",
    });
    expect(supabase.pedidos("rpc:registrar_conteo")).toEqual([
      [["rpc", "registrar_conteo", { p_producto: 7, p_contadas: 9, p_nota: "conteo del viernes" }]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("sin nota, no la envía", async () => {
    const supabase = usarSupabase({ "rpc:registrar_conteo": { data: 0 } });
    expect(await enviar({ tipo: "conteo", cantidad: "0" })).toEqual({ ok: "El conteo cuadra con el sistema" });
    expect(supabase.pedidos("rpc:registrar_conteo")[0][0]).toEqual(["rpc", "registrar_conteo", { p_producto: 7, p_contadas: 0, p_nota: undefined }]);
  });

  test("un conteo negativo no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await enviar({ tipo: "conteo", cantidad: "-1" })).toEqual({ error: "Escribe cuántas unidades contaste (0 o más)" });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "rpc:registrar_conteo": { error: { code: "42501", message: "Solo los socios cuentan el inventario" } } });
    expect(await enviar({ tipo: "conteo", cantidad: "4" })).toEqual({ error: "Solo los socios cuentan el inventario" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
