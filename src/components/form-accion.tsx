"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/ui";
import type { Accion } from "@/lib/acciones";

// <form> conectado a una server action que muestra su error o mensaje de éxito.
export function FormAccion({ accion, children, className }: { accion: Accion; children: React.ReactNode; className?: string }) {
  const [estado, despachar] = useActionState(accion, undefined);
  return (
    <form action={despachar} className={className}>
      {children}
      {(estado?.error || estado?.ok) && (
        <div className="basis-full">
          <Aviso tipo={estado.error ? "error" : "ok"}>{estado.error ?? estado.ok}</Aviso>
        </div>
      )}
    </form>
  );
}
