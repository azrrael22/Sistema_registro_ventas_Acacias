"use client";

import { useFormStatus } from "react-dom";
import { cx } from "@/components/ui";

// Botón que ocupa toda la fila de una notificación. Mientras la abre, la fila se atenúa y no
// acepta otro toque.
export function BotonFila({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={cx(
        "flex w-full cursor-pointer gap-3 px-4 py-4 text-left transition-[background-color,opacity] hover:bg-stone-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait sm:px-5 dark:hover:bg-stone-700/50 dark:focus-visible:outline-emerald-500",
        pending && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}
