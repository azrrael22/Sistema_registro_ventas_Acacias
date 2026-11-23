"use client";

import { useFormStatus } from "react-dom";
import { cx } from "@/components/ui";
import { useEnLinea } from "@/components/sin-conexion";

// Botón que ocupa toda la fila de una notificación. Mientras la abre, la fila se atenúa y no
// acepta otro toque; sin conexión también se atenúa, porque abrirla la marca como leída.
export function BotonFila({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const enLinea = useEnLinea();
  return (
    <button
      disabled={pending || !enLinea}
      className={cx(
        "flex w-full cursor-pointer gap-3 px-4 py-4 text-left transition-[background-color,opacity] enabled:hover:bg-stone-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-60 sm:px-5 dark:enabled:hover:bg-stone-700/50 dark:focus-visible:outline-emerald-500",
        pending ? "disabled:cursor-wait" : "disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
