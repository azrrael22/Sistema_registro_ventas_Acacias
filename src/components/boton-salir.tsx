"use client";

import { useFormStatus } from "react-dom";
import { cx } from "@/components/ui";
import { useEnLinea } from "@/components/sin-conexion";

// Botón de los formularios de Salir (encabezado y hoja «Más»): como los demás botones de enviar, se
// deshabilita mientras sale y sin conexión (cerrar la sesión necesita al servidor).
export function BotonSalir({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const enLinea = useEnLinea();
  return (
    <button
      disabled={pending || !enLinea}
      className={cx(className, "cursor-pointer disabled:opacity-50", pending ? "disabled:cursor-wait" : "disabled:cursor-not-allowed")}
    >
      {children}
    </button>
  );
}
