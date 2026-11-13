"use client";

import { useEffect, useRef, useState } from "react";
import { Etiqueta, cx } from "@/components/ui";
import { FotoProducto } from "@/components/foto-producto";
import { MAX_FOTO } from "@/lib/fotos";

const LADO_MAX = 1600;

// Reduce la foto en el navegador antes de enviarla: las del celular pesan varios MB y Vercel no
// acepta más de 4,5 MB. El servidor la convierte a WebP de todos modos (Safari no siempre sabe
// generar WebP), así que si el navegador no puede leerla se envía la original.
async function reducir(archivo: File) {
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAX / Math.max(imagen.width, imagen.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagen.width * escala);
    canvas.height = Math.round(imagen.height * escala);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    imagen.close();
    const exportar = (tipo: string) => new Promise<Blob | null>((listo) => canvas.toBlob(listo, tipo, 0.9));
    let blob = await exportar("image/webp");
    if (blob?.type !== "image/webp") {
      // JPEG no tiene transparencia: fondo blanco detrás de la imagen
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      blob = await exportar("image/jpeg");
    }
    return blob ? new File([blob], "foto", { type: blob.type }) : archivo;
  } catch {
    return archivo;
  }
}

// Selector de foto con vista previa. `actual` es la URL de la foto que ya tiene el producto.
export function CampoFoto({ texto = "Foto", requerida = false, actual = null, className }: { texto?: string; requerida?: boolean; actual?: string | null; className?: string }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [vista, setVista] = useState<string | null>(null);

  // React vacía el formulario después de cada acción: la vista previa vuelve a la foto actual
  useEffect(() => {
    const form = entrada.current?.form;
    const limpiar = () => setVista(null);
    form?.addEventListener("reset", limpiar);
    return () => form?.removeEventListener("reset", limpiar);
  }, []);

  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  const elegir = async (input: HTMLInputElement) => {
    const original = input.files?.[0];
    if (!original) {
      input.setCustomValidity("");
      return setVista(null);
    }
    input.setCustomValidity("Espera mientras se prepara la foto");
    const archivo = await reducir(original);
    if (archivo !== original) {
      const lista = new DataTransfer();
      lista.items.add(archivo);
      input.files = lista.files;
    }
    input.setCustomValidity(archivo.size > MAX_FOTO ? "La foto pesa más de 4 MB. Elige otra o tómala con menos resolución" : "");
    setVista(URL.createObjectURL(archivo));
  };

  return (
    <div className={cx("flex items-end gap-2", className)}>
      <FotoProducto src={vista ?? actual} onError={() => setVista(null)} />
      <Etiqueta texto={texto} className="min-w-0 flex-1">
        <input
          ref={entrada}
          type="file"
          name="foto"
          accept="image/*"
          required={requerida}
          onChange={(e) => elegir(e.currentTarget)}
          className="campo py-1.5 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-stone-800 hover:file:bg-stone-200 dark:file:bg-stone-700 dark:file:text-stone-200 dark:hover:file:bg-stone-600"
        />
      </Etiqueta>
    </div>
  );
}
