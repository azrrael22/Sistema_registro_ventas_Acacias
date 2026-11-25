// Movimientos de inventario: entradas, ajustes y conteos físicos.
import { numero, textoOpcional } from "@/lib/formulario";

export type Movimiento =
  // Conteo físico: lo que hay en realidad; la base de datos registra la diferencia como ajuste
  | { tipo: "conteo"; producto_id: number; contadas: number; nota: string | null }
  | { tipo: "entrada" | "ajuste"; producto_id: number; cantidad: number; nota: string | null };

export function leerMovimiento(form: FormData): Movimiento | { error: string } {
  const producto_id = Number(form.get("producto_id"));
  const cantidad = numero(form, "cantidad");
  const nota = textoOpcional(form, "nota");
  const tipo = form.get("tipo");
  if (tipo === "conteo") {
    return esConteo(cantidad) ? { tipo, producto_id, contadas: cantidad, nota } : { error: "Escribe cuántas unidades contaste (0 o más)" };
  }
  const cambio = tipo === "ajuste" ? "ajuste" : "entrada";
  const error = errorCambio(cambio, cantidad);
  return error ? { error } : { tipo: cambio, producto_id, cantidad, nota };
}

const esConteo = (cantidad: number) => Number.isInteger(cantidad) && cantidad >= 0;

// Una entrada suma; un ajuste puede sumar o restar
function errorCambio(tipo: "entrada" | "ajuste", cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad === 0) return "La cantidad debe ser un número entero distinto de 0";
  if (tipo === "entrada" && cantidad < 0) return "Una entrada debe ser positiva. Usa un ajuste para restar.";
  return null;
}

// Resultado de un conteo físico: diferencia = contadas − stock del sistema
export function mensajeConteo(diferencia: number) {
  if (diferencia === 0) return "El conteo cuadra con el sistema";
  if (diferencia === -1) return "Falta 1 unidad: queda registrada como perdida";
  if (diferencia < 0) return `Faltan ${-diferencia} unidades: quedan registradas como perdidas`;
  return diferencia === 1 ? "Sobra 1 unidad: se sumó al stock" : `Sobran ${diferencia} unidades: se sumaron al stock`;
}

// Stock por producto, a partir de la vista stock_producto (un stock sin valor es 0)
export const stockPorProducto = (filas: { producto_id: number | null; stock: number | null }[]) =>
  new Map(filas.map((s) => [s.producto_id, Number(s.stock ?? 0)]));

// Cómo se lee un movimiento en la lista: con signo, y un ajuste que resta es una pérdida (así
// aparece en los reportes)
export function describirMovimiento({ tipo, cantidad }: { tipo: string; cantidad: number }) {
  const perdida = tipo !== "entrada" && cantidad < 0;
  return {
    perdida,
    cantidad: `${cantidad > 0 ? "+" : "−"}${Math.abs(cantidad)}`,
    etiqueta: etiquetaMovimiento(tipo, perdida),
  };
}

const etiquetaMovimiento = (tipo: string, perdida: boolean) => {
  if (tipo === "entrada") return "Entrada";
  return perdida ? "Pérdida" : "Ajuste";
};
