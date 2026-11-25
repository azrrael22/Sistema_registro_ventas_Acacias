import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { formulario } from "@/test/formularios";
import { usarSupabase } from "@/test/supabase-falso";
import { actualizarNombre, cambiarContrasena, cambiarCorreo } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/headers", async () => (await import("@/test/next")).moduloHeaders);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const nombres = { primer_nombre: "Ana", primer_apellido: "Rojas", segundo_apellido: "Díaz" };

describe("actualizarNombre", () => {
  test("guarda el nombre y refresca el encabezado", async () => {
    const supabase = usarSupabase();
    expect(await actualizarNombre(undefined, formulario(nombres))).toEqual({ ok: "Nombre guardado" });
    expect(supabase.pedidos("from:empleados")).toEqual([
      [
        ["from", "empleados"],
        ["update", { ...nombres, segundo_nombre: null }],
        ["eq", "id", "empleado-1"],
      ],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("un nombre incompleto no llega a la base de datos", async () => {
    const supabase = usarSupabase();
    expect(await actualizarNombre(undefined, formulario({ ...nombres, segundo_apellido: "" }))).toEqual({ error: "Escribe tu segundo apellido" });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "from:empleados": { error: { code: "23514", message: "check" } } });
    expect(await actualizarNombre(undefined, formulario(nombres))).toEqual({
      error: "Algún dato no es válido. Revisa el formulario e inténtalo de nuevo.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("cambiarCorreo", () => {
  test("pide confirmar el cambio en los dos correos", async () => {
    const supabase = usarSupabase();
    expect(await cambiarCorreo(undefined, formulario({ email: " Nuevo@Acacias.test " }))).toEqual({
      ok: "Te enviamos un enlace de confirmación a tu correo actual y otro al nuevo. Ábrelos para terminar el cambio.",
    });
    expect(supabase.pedidos("auth.updateUser")).toEqual([
      [["updateUser", { email: "nuevo@acacias.test" }, { emailRedirectTo: "https://acacias.test/auth/callback?next=/perfil" }]],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/perfil");
  });

  test("el mismo correo, aunque cambien las mayúsculas, no se cambia", async () => {
    const supabase = usarSupabase();
    expect(await cambiarCorreo(undefined, formulario({ email: "Ana@Acacias.TEST" }))).toEqual({ error: "Ese ya es tu correo" });
    expect(supabase.pedidos("auth.updateUser")).toEqual([]);
  });

  test("un correo ya registrado", async () => {
    usarSupabase({ "auth.updateUser": { error: { message: "exists", code: "email_exists", status: 422 } } });
    expect(await cambiarCorreo(undefined, formulario({ email: "otro@acacias.test" }))).toEqual({ error: "Ese correo ya está registrado" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("cambiarContrasena", () => {
  const claves = { actual: "vieja-clave", password: "nueva-clave", confirmar: "nueva-clave" };

  test("comprueba la contraseña actual y guarda la nueva", async () => {
    const supabase = usarSupabase();
    expect(await cambiarContrasena(undefined, formulario(claves))).toEqual({ ok: "Contraseña actualizada" });
    expect(supabase.pedidos("auth.signInWithPassword")).toEqual([[["signInWithPassword", { email: "ana@acacias.test", password: "vieja-clave" }]]]);
    expect(supabase.pedidos("auth.updateUser")).toEqual([[["updateUser", { password: "nueva-clave" }]]]);
  });

  test("una contraseña nueva inválida no se intenta", async () => {
    const supabase = usarSupabase();
    expect(await cambiarContrasena(undefined, formulario({ ...claves, confirmar: "otra" }))).toEqual({ error: "Las contraseñas no coinciden" });
    expect(supabase.orden()).toEqual([]);
  });

  test("la contraseña actual equivocada", async () => {
    const supabase = usarSupabase({ "auth.signInWithPassword": { error: { message: "x", code: "invalid_credentials", status: 400 } } });
    expect(await cambiarContrasena(undefined, formulario(claves))).toEqual({ error: "La contraseña actual no es correcta" });
    expect(supabase.pedidos("auth.updateUser")).toEqual([]);
  });

  test("demasiados intentos no se confunde con una contraseña equivocada", async () => {
    usarSupabase({ "auth.signInWithPassword": { error: { message: "x", code: "over_request_rate_limit", status: 429 } } });
    expect(await cambiarContrasena(undefined, formulario(claves))).toEqual({
      error: "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
    });
  });

  test("Auth no guardó la nueva", async () => {
    usarSupabase({ "auth.updateUser": { error: { message: "x", code: "same_password", status: 422 } } });
    expect(await cambiarContrasena(undefined, formulario(claves))).toEqual({ error: "La nueva contraseña debe ser distinta a la actual" });
  });
});
