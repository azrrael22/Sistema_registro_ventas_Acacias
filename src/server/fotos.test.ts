import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { aWebp, guardarFoto } from "@/server/fotos";
import { noEsFoto } from "@/test/fotos";
import { supabaseFalso } from "@/test/supabase-falso";

type Supabase = Parameters<typeof guardarFoto>[0];
const cliente = (programadas: Parameters<typeof supabaseFalso>[0] = {}) => {
  const falso = supabaseFalso(programadas);
  return { falso, supabase: falso as unknown as Supabase };
};

describe("aWebp", () => {
  test("convierte la foto a WebP de máximo 512 px, sin agrandarla", async () => {
    const grande = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const webp = await aWebp(new File([new Uint8Array(grande)], "foto.jpg"));
    expect(await sharp(webp!).metadata()).toMatchObject({ format: "webp", width: 512, height: 256 });

    const pequena = await sharp({ create: { width: 100, height: 80, channels: 3, background: "#fff" } }).png().toBuffer();
    expect(await sharp((await aWebp(new File([new Uint8Array(pequena)], "foto.png")))!).metadata()).toMatchObject({ width: 100, height: 80 });
  });

  test("un archivo que no es imagen da null", async () => {
    expect(await aWebp(noEsFoto())).toBeNull();
  });
});

describe("guardarFoto", () => {
  const webp = Buffer.from("webp");

  test("sube la foto con un nombre nuevo, la asigna y borra la anterior", async () => {
    const { falso, supabase } = cliente();
    expect(await guardarFoto(supabase, 9, webp, "9/1.webp")).toBe(true);
    const [[subida]] = falso.pedidos("storage:productos.upload");
    expect(subida).toEqual(["upload", expect.stringMatching(/^9\/\d+\.webp$/), webp, { contentType: "image/webp", cacheControl: "31536000" }]);
    expect(falso.orden()).toEqual(["storage:productos.upload", "from:productos", "storage:productos.remove"]);
    expect(falso.pedidos("storage:productos.remove")).toEqual([[["remove", ["9/1.webp"]]]]);
  });

  test("sin foto anterior no borra nada", async () => {
    const { falso, supabase } = cliente();
    expect(await guardarFoto(supabase, 9, webp, null)).toBe(true);
    expect(falso.pedidos("storage:productos.remove")).toEqual([]);
  });

  test("si no se pudo subir, no toca el producto", async () => {
    const { falso, supabase } = cliente({ "storage:productos.upload": { error: { message: "x" } } });
    expect(await guardarFoto(supabase, 9, webp, "9/1.webp")).toBe(false);
    expect(falso.orden()).toEqual(["storage:productos.upload"]);
  });

  test("si no se pudo asignar, borra la que subió y conserva la anterior", async () => {
    const { falso, supabase } = cliente({ "from:productos": { error: { code: "42501", message: "permission denied" } } });
    expect(await guardarFoto(supabase, 9, webp, "9/1.webp")).toBe(false);
    const subida = falso.pedidos("storage:productos.upload")[0][0][1];
    expect(falso.pedidos("storage:productos.remove")).toEqual([[["remove", [subida]]]]);
  });
});
