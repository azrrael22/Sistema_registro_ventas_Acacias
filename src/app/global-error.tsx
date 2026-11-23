"use client";

import "./globals.css";
import { PantallaError } from "@/components/pantalla-error";

// Solo si falla el layout raíz (app/layout.tsx): reemplaza todo el documento, así que trae su
// propio <html> y los estilos. Sin esto, Next muestra su pantalla genérica en inglés.
export default function ErrorGlobal({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-50">
        <title>Algo salió mal · Ventas Las Acacias</title>
        <PantallaError error={error} retry={retry} suelta />
      </body>
    </html>
  );
}
