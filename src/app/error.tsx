"use client";

import { PantallaError } from "@/components/pantalla-error";

// Atrapa lo que el error.tsx de (app) no alcanza: un fallo en los layouts de los grupos, por ejemplo
// al leer la sesión o el contador de notificaciones en (app)/layout.tsx
export default function ErrorRaiz({ error, retry }: { error: unknown; retry: () => void }) {
  return <PantallaError error={error} retry={retry} suelta />;
}
