"use client";

import { useState, type ComponentProps } from "react";
import { Entrada, cx } from "@/components/ui";
import { IconoOjo, IconoOjoTachado } from "@/components/iconos";

// Campo de contraseña con un botón para mostrar u ocultar lo escrito.
export function EntradaContrasena({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Entrada type={visible ? "text" : "password"} className={cx("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 dark:text-stone-400 dark:hover:text-stone-50 dark:focus-visible:outline-emerald-500"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        {visible ? <IconoOjoTachado /> : <IconoOjo />}
      </button>
    </div>
  );
}
