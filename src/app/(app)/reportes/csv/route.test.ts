import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { usarSupabase } from "@/test/supabase-falso";
import { GET } from "./route";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);

// Hoy es el 12 nov 2026 en Colombia
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T15:00:00Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
});

const descargar = (query = "") => GET(new NextRequest(`https://acacias.test/reportes/csv${query}`));
const fila = { unidades_base: 0, unidades_perdidas: 0, unidades_quedan: 0, maneja_inventario: true, precio: 1000 };

describe("GET /reportes/csv", () => {
  test("descarga el reporte del periodo en dos secciones", async () => {
    usarSupabase({
      "rpc:reporte_socio": {
        data: [
          { periodo: "2026-11-01", producto_id: 1, producto: 'Dulce "de leche"', unidades: 3, ventas_netas: 4500 },
          { periodo: "2026-11-02", producto_id: 2, producto: "Tinto", unidades: 2, ventas_netas: 3000 },
        ],
      },
      "rpc:retiros_socio": { data: [{ dia: "2026-11-03", categoria: "=Dulces", categoria_id: 1, retiros: 1000 }] },
      "rpc:inventario_socio": {
        data: [
          { ...fila, producto_id: 1, producto: 'Dulce "de leche"', categoria: "=Dulces", unidades_base: 10, unidades_perdidas: 1, unidades_quedan: 6, precio: 1500 },
          { ...fila, producto_id: 2, producto: "Tinto", categoria: "Cafetería", maneja_inventario: false },
        ],
      },
    });
    const respuesta = await descargar();
    expect(respuesta.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="reporte-mensual-2026-10-12-a-2026-11-12.csv"');
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    // BOM para que Excel reconozca las tildes (text() lo quitaría); las fórmulas se escriben como texto; null queda vacío
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes).split("\r\n")).toEqual([
      '"Categoría","Ventas netas","Retiros","Balance"',
      `"'=Dulces",4500,1000,3500`,
      '"Cafetería",3000,0,3000',
      '"Total",7500,1000,6500',
      "",
      '"Producto","Categoría","Unidades base","Vendidas","Perdidas","Valor perdido","Quedan","Ventas netas"',
      `"Dulce ""de leche""","'=Dulces",10,3,1,1500,6,4500`,
      '"Tinto","Cafetería",,2,,,,3000',
      '"Total","",10,5,1,1500,6,7500',
    ]);
  });

  test.each([
    ["+", "+57"],
    ["-", "-5"],
    ["@", "@SUM"],
    ["tab", "\tx"],
    ["retorno", "\rx"],
  ])("un texto que empieza con %s no se ejecuta como fórmula", async (_, nombre) => {
    usarSupabase({ "rpc:inventario_socio": { data: [{ ...fila, producto_id: 1, producto: nombre, categoria: "X", unidades_quedan: 1 }] } });
    expect((await (await descargar()).text()).split("\r\n")[5]).toBe(`"'${nombre}","X",0,0,0,0,1,0`);
  });

  test("el nombre del archivo dice el periodo", async () => {
    usarSupabase();
    const respuesta = await descargar("?g=rango&desde=2026-01-01&hasta=2026-01-31");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="reporte-personalizado-2026-01-01-a-2026-01-31.csv"');
  });

  test("si la base de datos falla, muestra qué pasó en vez de un archivo roto", async () => {
    const error = { message: "fetch failed" };
    usarSupabase({ "rpc:retiros_socio": { error } });
    const respuesta = await descargar();
    expect(respuesta.status).toBe(500);
    expect(respuesta.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await respuesta.text()).toBe(
      "No se pudo generar el reporte porque el sistema tuvo un problema al leer los datos.\n\nVuelve atrás e inténtalo de nuevo; si sigue pasando, avísale a un administrador.",
    );
    expect(console.error).toHaveBeenCalledWith("No se pudo generar el CSV del reporte:", error);
  });
});
