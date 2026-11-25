import { describe, expect, test, vi } from "vitest";
import { empleado, Redireccion } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { getEmpleado, requerirAdmin, requerirEmpleadoActivo } from "@/server/sesion";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);

const sesion = { "auth.getClaims": { data: { claims: { sub: "empleado-1" } } } };
const conEmpleado = (cambios: Partial<typeof empleado> | null) =>
  usarSupabase({ ...sesion, "from:empleados": { data: cambios && { ...empleado, ...cambios } } });

describe("getEmpleado", () => {
  test("el perfil del usuario de la sesión", async () => {
    const supabase = conEmpleado({});
    expect(await getEmpleado()).toEqual(empleado);
    expect(supabase.pedidos("from:empleados")).toEqual([
      [["from", "empleados"], ["select", "*"], ["eq", "id", "empleado-1"], ["maybeSingle"], ["throwOnError"]],
    ]);
  });

  test("sin sesión no consulta", async () => {
    const supabase = usarSupabase({ "auth.getClaims": { data: null } });
    expect(await getEmpleado()).toBeNull();
    expect(supabase.pedidos("from:empleados")).toEqual([]);
  });

  test("si la consulta falla, lanza: el sistema falló, la sesión no venció", async () => {
    usarSupabase({ ...sesion, "from:empleados": { error: { message: "fetch failed" } } });
    await expect(getEmpleado()).rejects.toEqual({ message: "fetch failed" });
  });
});

describe("requerirEmpleadoActivo", () => {
  test("devuelve el empleado activo", async () => {
    conEmpleado({});
    expect(await requerirEmpleadoActivo()).toEqual(empleado);
  });

  test("sin perfil, al login", async () => {
    conEmpleado(null);
    await expect(requerirEmpleadoActivo()).rejects.toEqual(new Redireccion("/login"));
  });

  test("una cuenta sin aprobar espera en /pendiente", async () => {
    conEmpleado({ activo: false });
    await expect(requerirEmpleadoActivo()).rejects.toEqual(new Redireccion("/pendiente"));
  });
});

describe("requerirAdmin", () => {
  test("devuelve al admin", async () => {
    conEmpleado({ es_admin: true });
    expect(await requerirAdmin()).toEqual({ ...empleado, es_admin: true });
  });

  test("quien no es admin vuelve al inicio", async () => {
    conEmpleado({});
    await expect(requerirAdmin()).rejects.toEqual(new Redireccion("/"));
  });
});
