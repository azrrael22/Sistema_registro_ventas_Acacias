import Image from "next/image";
import { cx } from "@/components/ui";
import { IconoImagen } from "@/components/iconos";

// Miniatura del producto; sin foto muestra un ícono. Ya es un WebP pequeño: no hace falta optimizarla.
export function FotoProducto({ src, className, onError }: { src: string | null; className?: string; onError?: () => void }) {
  const marco = cx("size-10 shrink-0 rounded-lg bg-stone-100 dark:bg-stone-700", className);
  if (!src) {
    return (
      <span className={cx(marco, "grid place-items-center text-stone-400 dark:text-stone-500")}>
        <IconoImagen />
      </span>
    );
  }
  return <Image src={src} alt="" width={96} height={96} unoptimized onError={onError} className={cx(marco, "object-cover")} />;
}
