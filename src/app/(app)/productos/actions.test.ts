import { beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { MAX_FOTO } from "@/lib/fotos";
import { formulario } from "@/test/formularios";
import { fotoPng, noEsFoto } from "@/test/fotos";
import { usarSupabase } from "@/test/supabase-falso";
import { actualizarProducto, crearCategoria, crearProducto, salirCategoria, unirseCategoria } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const conFoto = async (campos: Record<string, string>, foto?: File) => {
  const form = formulario(campos);
  form.set("foto", foto ?? (await fotoPng()));
  return form;
};
const rutaFoto = (producto: number) => expect.stringMatching(new RegExp(`^${producto}/\\d+\\.webp$`));

describe("crearCategoria", () => {
  test("crea la categoría", async () => {
    const supabase = usarSupabase({ "from:categorias": { data: { id: 5 } } });
    expect(await crearCategoria(undefined, formulario({ nombre: "  Snacks " }))).toEqual({ ok: 'Categoría "Snacks" creada' });
    expect(supabase.pedidos("from:categorias")[0][1]).toEqual(["insert", { nombre: "Snacks" }]);
    expect(supabase.orden()).toEqual(["from:categorias"]);
    expect(revalidatePath).toHaveBeenCalledWith("/productos");
  });

  test("y hace socio a quien la crea si lo pidió", async () => {
    const supabase = usarSupabase({ "from:categorias": { data: { id: 5 } } });
    expect(await crearCategoria(undefined, formulario({ nombre: "Snacks", ser_socio: "on" }))).toEqual({ ok: 'Categoría "Snacks" creada' });
    expect(supabase.pedidos("from:socios")).toEqual([
      [
        ["from", "socios"],
        ["insert", { empleado_id: "empleado-1", categoria_id: 5 }],
      ],
    ]);
  });

  test("si no pudo hacerlo socio, dice que la categoría sí quedó creada", async () => {
    usarSupabase({ "from:categorias": { data: { id: 5 } }, "from:socios": { error: { code: "XX000", message: "x" } } });
    expect(await crearCategoria(undefined, formulario({ nombre: "Snacks", ser_socio: "on" }))).toEqual({
      error: 'Categoría "Snacks" creada, pero no se pudo hacerte socio. Únete desde la lista.',
    });
    expect(revalidatePath).toHaveBeenCalledWith("/productos");
  });

  test.each([["vacío", { nombre: " " }], ["ausente", {}]])("un nombre %s no se crea", async (_, campos) => {
    const supabase = usarSupabase();
    expect(await crearCategoria(undefined, formulario(campos))).toEqual({ error: "Escribe el nombre de la categoría" });
    expect(supabase.orden()).toEqual([]);
  });

  test("un nombre repetido", async () => {
    usarSupabase({ "from:categorias": { error: { code: "23505", message: "duplicate key" } } });
    expect(await crearCategoria(undefined, formulario({ nombre: "Snacks" }))).toEqual({ error: "Ya existe un registro con ese nombre" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("crearProducto", () => {
  const campos = { nombre: "Gaseosa", precio: "2500", categoria_id: "4", maneja_inventario: "on" };

  test("crea el producto y sube su foto en WebP", async () => {
    const supabase = usarSupabase({ "from:productos": { data: { id: 9 } } });
    expect(await crearProducto(undefined, await conFoto(campos))).toEqual({ ok: 'Producto "Gaseosa" creado' });
    const [crear, asignarFoto] = supabase.pedidos("from:productos");
    expect(crear[1]).toEqual(["insert", { nombre: "Gaseosa", precio: 2500, maneja_inventario: true, categoria_id: 4 }]);
    const [subida] = supabase.pedidos("storage:productos.upload");
    expect(subida[0]).toEqual(["upload", rutaFoto(9), expect.any(Buffer), { contentType: "image/webp", cacheControl: "31536000" }]);
    expect(asignarFoto).toEqual([["from", "productos"], ["update", { foto: subida[0][1] }], ["eq", "id", 9]]);
    expect(revalidatePath).toHaveBeenCalledWith("/productos");
  });

  test("sin foto no se crea", async () => {
    const supabase = usarSupabase();
    expect(await crearProducto(undefined, formulario(campos))).toEqual({ error: "Agrega una foto del producto" });
    expect(supabase.orden()).toEqual([]);
  });

  test("un archivo que no es imagen no se crea", async () => {
    const supabase = usarSupabase();
    expect(await crearProducto(undefined, await conFoto(campos, noEsFoto()))).toEqual({
      error: "No se pudo leer la imagen. Usa una foto JPG, PNG o WebP",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("una foto de más de 4 MB no se crea", async () => {
    const pesada = new File([new Uint8Array(MAX_FOTO + 1)], "grande.jpg", { type: "image/jpeg" });
    expect(await crearProducto(undefined, await conFoto(campos, pesada))).toEqual({ error: "La foto pesa más de 4 MB" });
  });

  test("una foto de 4 MB justos sí se lee", async () => {
    const justa = new File([new Uint8Array(MAX_FOTO)], "justa.jpg", { type: "image/jpeg" });
    expect(await crearProducto(undefined, await conFoto(campos, justa))).toEqual({ error: "No se pudo leer la imagen. Usa una foto JPG, PNG o WebP" });
  });

  test("datos inválidos no se crean", async () => {
    const supabase = usarSupabase();
    expect(await crearProducto(undefined, await conFoto({ ...campos, precio: "0" }))).toEqual({ error: "El precio debe ser mayor que 0" });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "from:productos": { error: { code: "23505", message: "duplicate key" } } });
    expect(await crearProducto(undefined, await conFoto(campos))).toEqual({ error: "Ya existe un registro con ese nombre" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("si la foto no se pudo subir, dice que el producto sí quedó creado", async () => {
    usarSupabase({ "from:productos": { data: { id: 9 } }, "storage:productos.upload": { error: { message: "Storage caído" } } });
    expect(await crearProducto(undefined, await conFoto(campos))).toEqual({
      error: 'Producto "Gaseosa" creado, pero la foto no se pudo subir. Agrégala desde Editar',
    });
    expect(revalidatePath).toHaveBeenCalledWith("/productos");
  });
});

describe("actualizarProducto", () => {
  const campos = { id: "9", nombre: "Gaseosa", precio: "2800", activo: "on" };

  test("guarda los cambios sin foto nueva", async () => {
    const supabase = usarSupabase({ "from:productos": { data: [{ id: 9, foto: "9/1.webp" }] } });
    expect(await actualizarProducto(undefined, formulario(campos))).toEqual({ ok: "Producto actualizado" });
    expect(supabase.pedidos("from:productos")).toEqual([
      [
        ["from", "productos"],
        ["update", { nombre: "Gaseosa", precio: 2800, activo: true, maneja_inventario: false }],
        ["eq", "id", 9],
        ["select", "id, foto"],
      ],
    ]);
    expect(supabase.orden()).toEqual(["from:productos"]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("con foto nueva, la sube y borra la anterior", async () => {
    const supabase = usarSupabase({ "from:productos": { data: [{ id: 9, foto: "9/1.webp" }] } });
    expect(await actualizarProducto(undefined, await conFoto(campos))).toEqual({ ok: "Producto actualizado" });
    expect(supabase.pedidos("storage:productos.upload")[0][0]).toEqual(["upload", rutaFoto(9), expect.any(Buffer), expect.any(Object)]);
    expect(supabase.pedidos("storage:productos.remove")).toEqual([[["remove", ["9/1.webp"]]]]);
  });

  test("si la foto no se pudo subir, los datos sí quedaron", async () => {
    usarSupabase({ "from:productos": { data: [{ id: 9, foto: null }] }, "storage:productos.upload": { error: { message: "x" } } });
    expect(await actualizarProducto(undefined, await conFoto(campos))).toEqual({
      error: "Los datos se guardaron, pero la foto no se pudo subir. Intenta de nuevo",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("sin permiso para editarlo, la base de datos no devuelve filas", async () => {
    usarSupabase({ "from:productos": { data: [] } });
    expect(await actualizarProducto(undefined, formulario(campos))).toEqual({
      error: "Solo los socios de la categoría, quien creó el producto o un admin pueden editarlo",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("datos inválidos no se guardan", async () => {
    const supabase = usarSupabase();
    expect(await actualizarProducto(undefined, formulario({ ...campos, precio: "0" }))).toEqual({
      error: "Asigna un precio antes de activar el producto",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("una foto ilegible no se guarda", async () => {
    const supabase = usarSupabase();
    expect(await actualizarProducto(undefined, await conFoto(campos, noEsFoto()))).toEqual({
      error: "No se pudo leer la imagen. Usa una foto JPG, PNG o WebP",
    });
    expect(supabase.orden()).toEqual([]);
  });

  test("si la base de datos lo impide, se dice por qué", async () => {
    usarSupabase({ "from:productos": { error: { code: "23505", message: "duplicate key" } } });
    expect(await actualizarProducto(undefined, formulario(campos))).toEqual({ error: "Ya existe un registro con ese nombre" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("sociedades", () => {
  test("unirse a una categoría", async () => {
    const supabase = usarSupabase();
    expect(await unirseCategoria(undefined, formulario({ categoria_id: "4" }))).toBeUndefined();
    expect(supabase.pedidos("from:socios")[0][1]).toEqual(["insert", { empleado_id: "empleado-1", categoria_id: 4 }]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("unirse a una categoría de la que ya es socio", async () => {
    usarSupabase({ "from:socios": { error: { code: "23505", message: "duplicate key" } } });
    expect(await unirseCategoria(undefined, formulario({ categoria_id: "4" }))).toEqual({ error: "Ya eres socio de esta categoría" });
  });

  test("otro error al unirse", async () => {
    usarSupabase({ "from:socios": { error: { code: "42501", message: "permission denied for table socios" } } });
    expect(await unirseCategoria(undefined, formulario({ categoria_id: "4" }))).toEqual({ error: "No tienes permiso para hacer esto" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("salir de una sociedad conserva el historial", async () => {
    const supabase = usarSupabase();
    expect(await salirCategoria(undefined, formulario({ categoria_id: "4" }))).toBeUndefined();
    const [salida] = supabase.pedidos("from:socios");
    expect(salida[1]).toEqual(["update", { activo: false, salio_en: expect.any(String) }]);
    expect(salida.slice(2)).toEqual([
      ["eq", "empleado_id", "empleado-1"],
      ["eq", "categoria_id", 4],
      ["eq", "activo", true],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  test("un error al salir", async () => {
    usarSupabase({ "from:socios": { error: { code: "P0001", message: "Eres el último socio" } } });
    expect(await salirCategoria(undefined, formulario({ categoria_id: "4" }))).toEqual({ error: "Eres el último socio" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
