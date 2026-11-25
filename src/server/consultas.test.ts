import { describe, expect, test, vi } from "vitest";
import { usarSupabase } from "@/test/supabase-falso";
import { misCategorias, misProductos } from "@/server/consultas";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);

describe("misCategorias", () => {
  test("las categorías donde es socio activo", async () => {
    const supabase = usarSupabase({ "from:socios": { data: [{ categoria_id: 2 }, { categoria_id: 5 }] } });
    expect(await misCategorias("empleado-1")).toEqual([2, 5]);
    expect(supabase.pedidos("from:socios")).toEqual([
      [["from", "socios"], ["select", "categoria_id"], ["eq", "empleado_id", "empleado-1"], ["eq", "activo", true], ["throwOnError"]],
    ]);
  });
});

describe("misProductos", () => {
  test("los productos de sus categorías", async () => {
    const productos = [{ id: 9, nombre: "Gaseosa" }];
    const supabase = usarSupabase({ "from:socios": { data: [{ categoria_id: 2 }] }, "from:productos": { data: productos } });
    expect(await misProductos("empleado-1")).toEqual(productos);
    expect(supabase.pedidos("from:productos")[0]).toContainEqual(["in", "categoria_id", [2]]);
  });

  test("sin sociedades no consulta productos", async () => {
    const supabase = usarSupabase({ "from:socios": { data: [] } });
    expect(await misProductos("empleado-1")).toEqual([]);
    expect(supabase.pedidos("from:productos")).toEqual([]);
  });
});
