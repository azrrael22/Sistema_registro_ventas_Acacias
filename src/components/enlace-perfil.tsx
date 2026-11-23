"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { IconoUsuario } from "@/components/iconos";

// Enlace a Mi perfil en el encabezado. Es de cliente solo para saber si la ruta actual es /perfil:
// ahí queda marcado, porque Perfil no es una de las pestañas de la navegación.
export function EnlacePerfil({ nombre }: { nombre: string }) {
  const ruta = usePathname();
  const activo = ruta === "/perfil" || ruta.startsWith("/perfil/");

  return (
    <Link
      href="/perfil"
      aria-current={activo ? "page" : undefined}
      className={cx(
        "flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 pointer-coarse:h-11 pointer-coarse:px-3 dark:focus-visible:outline-emerald-500",
        // Activo: el mismo escalón de superficie que el hover, no el verde de las pestañas
        activo
          ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50",
      )}
    >
      <IconoUsuario />
      <span className="hidden sm:inline">{nombre}</span>
      {/* El nombre accesible incluye lo que se ve: «Valentina Ruiz, mi perfil».
          En celular solo se ve el ícono, así que ahí es «Mi perfil». */}
      <span className="sr-only">
        <span className="hidden sm:inline">, mi perfil</span>
        <span className="sm:hidden">Mi perfil</span>
      </span>
    </Link>
  );
}
