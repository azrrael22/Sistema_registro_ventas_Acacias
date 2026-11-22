// Fotos de productos: archivos WebP en el bucket público "productos" de Supabase Storage.

// Tope de la foto que envía el navegador: Vercel no acepta peticiones de más de 4,5 MB
export const MAX_FOTO = 4 * 1024 * 1024;

export const urlFoto = (ruta: string | null) =>
  ruta ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${ruta}` : null;
