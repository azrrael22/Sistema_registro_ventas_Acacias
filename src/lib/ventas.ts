// Ventas y devoluciones: lo que se envía a la RPC registrar_venta.
import { texto } from "@/lib/formulario";

// precio_unitario solo se envía si hay descuento; la BD impide que supere el precio del producto
export type ItemVenta = { producto_id: number; cantidad: number; precio_unitario?: number };

const precioValido = (precio: number | undefined) => precio === undefined || (Number.isFinite(precio) && precio >= 0);

// Los productos de la venta con cantidad entera mayor que 0; los demás se descartan
export function validarItemsVenta(items: ItemVenta[]): { items: ItemVenta[] } | { error: string } {
  const validos = items.filter((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);
  if (!validos.length) return { error: "Agrega al menos un producto" };
  if (!validos.every((i) => precioValido(i.precio_unitario))) return { error: "Precio inválido" };
  return { items: validos };
}

// Formulario de devolución: un campo cantidad_<producto> por cada producto de la venta original
export type Devolucion = { venta_id: number; items: ItemVenta[]; nota: string };

export function leerDevolucion(form: FormData): Devolucion | { error: string } {
  const items: ItemVenta[] = [];
  for (const [clave, valor] of form.entries()) {
    const cantidad = Number(valor);
    if (clave.startsWith("cantidad_") && cantidad > 0) items.push({ producto_id: Number(clave.slice("cantidad_".length)), cantidad });
  }
  if (!items.length) return { error: "Indica cuántas unidades se devuelven" };
  return { venta_id: Number(form.get("venta_id")), items, nota: texto(form, "nota") };
}
