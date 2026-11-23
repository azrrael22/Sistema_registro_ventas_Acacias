"use client";

import { useSyncExternalStore } from "react";
import { IconoSinConexion } from "@/components/iconos";

// Conexión del dispositivo: navigator.onLine y los eventos online/offline. En el servidor y al
// hidratar se supone que hay, para que el HTML coincida.
function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

export function useEnLinea() {
  return useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
}

// Aviso de que el dispositivo no tiene conexión: explica por qué los botones de enviar están
// deshabilitados. La región role="status" siempre está en el DOM (vacía con conexión) para que los
// lectores de pantalla anuncien el cambio.
// `franja`: a todo el ancho, bajo las pestañas del encabezado fijo (globals.css le hace espacio en
// el scroll-padding por su id). `caja`: en las pantallas de ingreso.
export function AvisoSinConexion({ forma = "franja" }: { forma?: "franja" | "caja" }) {
  const enLinea = useEnLinea();
  const texto = (
    <>
      <IconoSinConexion className="mt-px" />
      <span>Sin conexión a internet. No se puede guardar nada hasta que vuelva.</span>
    </>
  );
  return (
    <div role="status" aria-atomic="true">
      {!enLinea &&
        (forma === "franja" ? (
          <div
            id="aviso-sin-conexion"
            className="border-t border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 print:hidden"
          >
            <p className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2 text-sm sm:px-6">{texto}</p>
          </div>
        ) : (
          <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {texto}
          </p>
        ))}
    </div>
  );
}
