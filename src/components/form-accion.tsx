"use client";

import { useActionState } from "react";
import { Aviso, cx } from "@/components/ui";
import { atraparFallos, type Accion } from "@/lib/acciones";

// <form> conectado a una server action que muestra su error o mensaje de éxito. Si la acción
// lanza una excepción (sin internet, el servidor falló), también lo explica aquí.
// `claseAviso`: dónde va el aviso dentro del formulario (por defecto, en su propia línea).
export function FormAccion({
  accion,
  children,
  className,
  claseAviso,
}: {
  accion: Accion;
  children: React.ReactNode;
  className?: string;
  claseAviso?: string;
}) {
  const [estado, despachar] = useActionState(atraparFallos(accion), undefined);
  return (
    <form action={despachar} className={className}>
      {children}
      {(estado?.error || estado?.ok) && (
        <div className={cx("basis-full", claseAviso)}>
          <Aviso tipo={estado.error ? "error" : "ok"}>{estado.error ?? estado.ok}</Aviso>
        </div>
      )}
    </form>
  );
}
