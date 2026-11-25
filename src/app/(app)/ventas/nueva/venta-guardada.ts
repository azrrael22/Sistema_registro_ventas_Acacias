import { useCallback, useSyncExternalStore } from "react";
import { hoy } from "@/lib/formato";
import { VENTA_VACIA, esVentaVacia, ventaDesdeTexto, type Venta } from "./venta";

// La venta en curso (cantidades, descuentos y nota) se guarda en el celular mientras no se
// registra: si se va la conexión, se recarga la página o se cierra la app, sigue ahí al volver a
// Vender. Hay una por empleado (la clave lleva su id) y solo cuenta la del día: una de ayer se
// descarta, porque los precios y el stock pudieron cambiar.
// El estado vive en memoria y se copia a localStorage. Si el navegador no deja guardar (sin
// espacio, almacenamiento bloqueado), el carrito funciona igual, solo que no sobrevive al cierre.
// Con useSyncExternalStore el servidor y la hidratación ven la venta vacía, y enseguida aparece la
// guardada, sin un setState dentro de un efecto.

let actual: { clave: string; venta: Venta } | null = null;
const oyentes = new Set<() => void>();

function cargar(clave: string): Venta {
  try {
    return ventaDesdeTexto(localStorage.getItem(clave), hoy());
  } catch {
    // Almacenamiento bloqueado: se empieza de cero
    return VENTA_VACIA;
  }
}

// Siempre el mismo objeto mientras no cambie (useSyncExternalStore lo exige)
function leer(clave: string) {
  if (actual?.clave !== clave) actual = { clave, venta: cargar(clave) };
  return actual.venta;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  // La misma venta abierta en otra pestaña
  const deOtraPestana = (e: StorageEvent) => {
    if (!actual || e.key !== actual.clave) return;
    actual = { clave: actual.clave, venta: cargar(actual.clave) };
    oyente();
  };
  window.addEventListener("storage", deOtraPestana);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", deOtraPestana);
  };
}

export function useVentaGuardada(clave: string) {
  const venta = useSyncExternalStore(suscribir, () => leer(clave), () => VENTA_VACIA);

  const cambiarVenta = useCallback(
    (cambio: (venta: Venta) => Venta) => {
      const nueva = cambio(leer(clave));
      actual = { clave, venta: nueva };
      try {
        if (esVentaVacia(nueva)) localStorage.removeItem(clave);
        else localStorage.setItem(clave, JSON.stringify({ ...nueva, dia: hoy() }));
      } catch {
        // Sin espacio o almacenamiento bloqueado: la venta sigue en memoria
      }
      oyentes.forEach((avisar) => avisar());
    },
    [clave],
  );

  return [venta, cambiarVenta] as const;
}
