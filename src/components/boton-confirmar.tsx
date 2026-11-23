"use client";

import { useState } from "react";
import { Boton, type Variante } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";

// Botón de envío que pide confirmación en dos pasos, sin ventana emergente: el primer toque lo
// cambia por «confirmar» (en rojo, ya enfocado) y «Cancelar». Esc también cancela.
// Para acciones que un toque por error no debería hacer (dejar una sociedad, desactivar a alguien).
export function BotonConfirmar({
  children,
  confirmar,
  variante = "secundario",
  className,
}: {
  children: React.ReactNode;
  confirmar: string;
  variante?: Variante;
  className?: string;
}) {
  const [armado, setArmado] = useState(false);

  if (!armado) {
    return (
      <Boton type="button" variante={variante} className={className} onClick={() => setArmado(true)}>
        {children}
      </Boton>
    );
  }
  return (
    <span className="flex flex-wrap gap-2" onKeyDown={(e) => e.key === "Escape" && setArmado(false)}>
      <BotonEnvio variante="peligro" pendiente="…" autoFocus>
        {confirmar}
      </BotonEnvio>
      <Boton type="button" variante="fantasma" onClick={() => setArmado(false)}>
        Cancelar
      </Boton>
    </span>
  );
}
