"use client";

import { Boton } from "@/components/ui";

// Abre el diálogo de impresión del navegador (desde ahí también se guarda como PDF)
export function BotonImprimir() {
  return (
    <Boton type="button" variante="secundario" onClick={() => window.print()}>
      Imprimir / PDF
    </Boton>
  );
}
