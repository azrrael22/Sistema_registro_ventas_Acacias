import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { Redireccion } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { registrarDevolucion, registrarVenta } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe("registrarVenta", () => {
  test("envía los productos con cantidad y la nota", async () => {
    const supabase = usarSupabase();
    const items = [
      { producto_id: 1, cantidad: 2 },
      { producto_id: 2, cantidad: 0 },
      { producto_id: 3, cantidad: 1, precio_unitario: 2000 },
    ];
    expect(await registrarVenta(items, "pagó con 50 mil")).toEqual({ ok: "Venta registrada" });
    expect(supabase.pedidos("rpc:registrar_venta")).toEqual([
      [["rpc", "registrar_venta", { p_items: [items[0], items[2]], p_nota: "pagó con 50 mil" }]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("sin productos no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await registrarVenta([{ producto_id: 1, cantidad: 0 }], "")).toEqual({ error: "Agrega al menos un producto" });
    expect(supabase.orden()).toEqual([]);
  });

  test("un precio inválido no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await registrarVenta([{ producto_id: 1, cantidad: 1, precio_unitario: -5 }], "")).toEqual({ error: "Precio inválido" });
    expect(supabase.orden()).toEqual([]);
  });

  test("sin stock, la base de datos lo dice", async () => {
    usarSupabase({ "rpc:registrar_venta": { error: { code: "P0001", message: "No hay suficiente stock de Gaseosa (quedan 1)" } } });
    expect(await registrarVenta([{ producto_id: 1, cantidad: 2 }], "")).toEqual({ error: "No hay suficiente stock de Gaseosa (quedan 1)" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("registrarDevolucion", () => {
  test("registra la devolución y vuelve a Ventas", async () => {
    const supabase = usarSupabase();
    const form = formulario({ venta_id: "31", cantidad_4: "2", cantidad_9: "0", nota: "venía dañada" });
    await expect(registrarDevolucion(undefined, form)).rejects.toEqual(new Redireccion("/ventas"));
    expect(supabase.pedidos("rpc:registrar_venta")).toEqual([
      [
        [
          "rpc",
          "registrar_venta",
          { p_items: [{ producto_id: 4, cantidad: 2 }], p_tipo: "devolucion", p_venta_origen: 31, p_nota: "venía dañada" },
        ],
      ],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("sin unidades no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await registrarDevolucion(undefined, formulario({ venta_id: "31", cantidad_4: "0" }))).toEqual({
      error: "Indica cuántas unidades se devuelven",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué y no se sale de la pantalla", async () => {
    usarSupabase({ "rpc:registrar_venta": { error: { code: "P0001", message: "No se pueden devolver más unidades de las vendidas" } } });
    expect(await registrarDevolucion(undefined, formulario({ venta_id: "31", cantidad_4: "5" }))).toEqual({
      error: "No se pueden devolver más unidades de las vendidas",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
