"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Aviso, Boton, Titulo, claseBoton } from "@/components/ui";
import { PantallaCentrada } from "@/components/pantalla-centrada";
import { codigoError } from "@/lib/errores";

// Conexión del dispositivo. En el servidor y al hidratar se supone que hay.
function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

// Lo que muestran los error.tsx cuando una pantalla no carga. Dice qué pasó: sin internet (y
// entonces se recarga sola cuando vuelve) o un fallo del sistema (Supabase caído, un error), con
// el código para buscarlo en los logs.
// `suelta`: fuera de la app, cuando falla el propio layout y no hay encabezado ni navegación.
export function PantallaError({ error, retry, suelta = false }: { error: unknown; retry: () => void; suelta?: boolean }) {
  const enLinea = useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
  // En producción el mensaje real no llega al navegador; el código sirve para buscarlo en los logs
  const codigo = codigoError(error);

  // Al volver la conexión se reintenta sin que haga falta tocar nada
  useEffect(() => {
    const alVolver = () => retry();
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, [retry]);

  const que = suelta ? "la aplicación" : "esta pantalla";
  const titulo = enLinea ? "Algo salió mal" : "Sin conexión a internet";
  const explicacion = enLinea
    ? `El sistema tuvo un problema al cargar ${que}; no es por algo que hayas hecho. Toca Reintentar y, si sigue pasando, avísale a un administrador${codigo ? " con el código del error" : ""}.`
    : `No se pudo cargar ${que} porque tu dispositivo no tiene conexión. Cuando vuelva, se carga sola.`;

  const acciones = (
    <>
      <div className={suelta ? "mt-8 flex flex-col gap-2" : "mt-4 flex flex-wrap gap-2"}>
        <Boton onClick={() => retry()}>Reintentar</Boton>
        <Link href="/" className={claseBoton("secundario")}>
          Ir al inicio
        </Link>
      </div>
      {codigo && enLinea && (
        <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">
          Código del error: <span className="font-mono">{codigo}</span>
        </p>
      )}
    </>
  );

  if (suelta) {
    return (
      <PantallaCentrada titulo={titulo}>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{explicacion}</p>
        {acciones}
      </PantallaCentrada>
    );
  }
  return (
    <>
      <Titulo>{titulo}</Titulo>
      <Aviso tipo={enLinea ? "error" : "info"}>{explicacion}</Aviso>
      {acciones}
    </>
  );
}
