"use client";

import { PantallaError } from "@/components/pantalla-error";

// Una pantalla de la app que no cargó: se ve dentro de la app, con su navegación, y se puede reintentar
export default function ErrorApp({ error, retry }: { error: unknown; retry: () => void }) {
  return <PantallaError error={error} retry={retry} />;
}
