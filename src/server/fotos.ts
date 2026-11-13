import "server-only";
import sharp from "sharp";
import type { createClient } from "@/server/supabase";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Convierte cualquier imagen que lea sharp (JPG, PNG, GIF, AVIF, TIFF, SVG, WebP…) a WebP de máximo 512 px.
// rotate() endereza las fotos del celular según su EXIF. null si el archivo no es una imagen legible.
export async function aWebp(archivo: File) {
  try {
    return await sharp(Buffer.from(await archivo.arrayBuffer()))
      .rotate()
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

// Sube la foto con un nombre nuevo (así ningún caché muestra la anterior), la asigna al producto
// y borra la vieja. Storage aplica los mismos permisos que editar el producto.
export async function guardarFoto(supabase: Supabase, productoId: number, webp: Buffer, anterior: string | null) {
  const fotos = supabase.storage.from("productos");
  const ruta = `${productoId}/${Date.now()}.webp`;
  const { error } = await fotos.upload(ruta, webp, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) return false;
  const { error: errorProducto } = await supabase.from("productos").update({ foto: ruta }).eq("id", productoId);
  if (errorProducto) {
    await fotos.remove([ruta]);
    return false;
  }
  if (anterior) await fotos.remove([anterior]);
  return true;
}
