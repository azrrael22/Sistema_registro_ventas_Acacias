"use client";

import Link from "next/link";
import { Aviso, Boton, Titulo, claseBoton } from "@/components/ui";
import { PantallaCentrada } from "@/components/pantalla-centrada";

// Lo que muestran los error.tsx cuando una pantalla no carga (sin conexión, Supabase caído…).
// `suelta`: fuera de la app, cuando falla el propio layout y no hay encabezado ni navegación.
export function PantallaError({ error, retry, suelta = false }: { error: unknown; retry: () => void; suelta?: boolean }) {
  // En producción el mensaje real no llega al navegador; el código sirve para buscarlo en los logs
  const codigo = error instanceof Error && "digest" in error && error.digest ? String(error.digest) : null;

  const acciones = (
    <>
      <div className={suelta ? "mt-8 flex flex-col gap-2" : "mt-4 flex flex-wrap gap-2"}>
        <Boton onClick={() => retry()}>Reintentar</Boton>
        <Link href="/" className={claseBoton("secundario")}>
          Ir al inicio
        </Link>
      </div>
      {codigo && (
        <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">
          Código del error: <span className="font-mono">{codigo}</span>
        </p>
      )}
    </>
  );

  if (suelta) {
    return (
      <PantallaCentrada titulo="Algo salió mal">
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">No se pudo cargar la aplicación. Revisa tu conexión e inténtalo de nuevo.</p>
        {acciones}
      </PantallaCentrada>
    );
  }
  return (
    <>
      <Titulo>Algo salió mal</Titulo>
      <Aviso>No se pudo cargar esta pantalla. Revisa tu conexión e inténtalo de nuevo.</Aviso>
      {acciones}
    </>
  );
}
