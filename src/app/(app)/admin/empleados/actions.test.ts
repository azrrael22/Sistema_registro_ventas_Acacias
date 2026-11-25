import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { usarSupabase } from "@/test/supabase-falso";
import { actualizarDocumento, actualizarEmpleado } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe("actualizarEmpleado", () => {
  test("aprueba la cuenta", async () => {
    const supabase = usarSupabase();
    expect(await actualizarEmpleado(undefined, formulario({ id: "empleado-2", activo: "true", es_admin: "false" }))).toBeUndefined();
    expect(supabase.pedidos("rpc:actualizar_empleado")).toEqual([
      [["rpc", "actualizar_empleado", { p_id: "empleado-2", p_activo: true, p_es_admin: false }]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/empleados");
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "rpc:actualizar_empleado": { error: { code: "P0001", message: "No puedes quitarte el rol de admin" } } });
    expect(await actualizarEmpleado(undefined, formulario({ id: "empleado-1", activo: "true", es_admin: "false" }))).toEqual({
      error: "No puedes quitarte el rol de admin",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("actualizarDocumento", () => {
  test("guarda el documento", async () => {
    const supabase = usarSupabase();
    expect(await actualizarDocumento(undefined, formulario({ id: "empleado-2", tipo_documento: "CC", numero_documento: "1.032.456" }))).toEqual({
      ok: "Documento guardado",
    });
    expect(supabase.pedidos("rpc:actualizar_documento_empleado")).toEqual([
      [["rpc", "actualizar_documento_empleado", { p_id: "empleado-2", p_tipo: "CC", p_numero: "1032456" }]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/empleados");
  });

  test("un documento inválido no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await actualizarDocumento(undefined, formulario({ id: "empleado-2", tipo_documento: "CC", numero_documento: "12" }))).toEqual({
      error: "El número de documento debe tener entre 5 y 12 dígitos",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("un documento de otro empleado", async () => {
    usarSupabase({ "rpc:actualizar_documento_empleado": { error: { code: "23505", message: "duplicate key" } } });
    expect(await actualizarDocumento(undefined, formulario({ id: "empleado-2", tipo_documento: "CC", numero_documento: "1032456" }))).toEqual({
      error: "Ese documento ya está registrado",
    });
  });

  test("otro error de la base de datos", async () => {
    usarSupabase({ "rpc:actualizar_documento_empleado": { error: { code: "42501", message: "permission denied for function" } } });
    expect(await actualizarDocumento(undefined, formulario({ id: "empleado-2", tipo_documento: "CC", numero_documento: "1032456" }))).toEqual({
      error: "No tienes permiso para hacer esto",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
