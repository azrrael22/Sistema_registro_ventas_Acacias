"use client";

import { useFormStatus } from "react-dom";
import { Boton } from "@/components/ui";
import { useEnLinea } from "@/components/sin-conexion";
import type { ComponentProps } from "react";

// Botón de formulario que se deshabilita mientras la acción del servidor corre y mientras el
// dispositivo no tiene conexión (AvisoSinConexion explica por qué). `disabled` se suma a esos dos
// casos: nunca los anula, para que no se pueda enviar dos veces.
export function BotonEnvio({
  children,
  pendiente = "Guardando…",
  disabled,
  ...props
}: ComponentProps<typeof Boton> & { pendiente?: string }) {
  const { pending } = useFormStatus();
  const enLinea = useEnLinea();
  return (
    <Boton type="submit" {...props} disabled={pending || !enLinea || disabled}>
      {pending ? pendiente : children}
    </Boton>
  );
}
