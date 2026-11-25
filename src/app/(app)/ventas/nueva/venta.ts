// La venta que se arma en Vender: cantidades, precios con descuento y nota. Todo puro: el estado
// vive en venta-guardada.ts y la pantalla en carrito.tsx.
import { urlFoto } from "@/lib/fotos";
import { stockPorProducto } from "@/lib/inventario";
import type { ItemVenta } from "@/lib/ventas";

// stock null: el producto no lleva inventario y se vende sin tope
export type Producto = { id: number; nombre: string; precio: number; foto: string | null; categoria: string; stock: number | null };

// Los productos activos como se venden: con la categoría y el stock (null si no lleva inventario),
// ordenados por categoría y nombre
type FilaProducto = { id: number; nombre: string; precio: number; foto: string | null; maneja_inventario: boolean; categorias: { nombre: string } | null };
export function productosEnVenta(filas: FilaProducto[], stock: { producto_id: number | null; stock: number | null }[]): Producto[] {
  const stockPor = stockPorProducto(stock);
  return filas
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: Number(p.precio),
      foto: urlFoto(p.foto),
      categoria: p.categorias?.nombre ?? "",
      stock: p.maneja_inventario ? (stockPor.get(p.id) ?? 0) : null,
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));
}

// Precios como texto, para poder borrarlo mientras se escribe
export type Venta = { cantidades: Record<number, number>; precios: Record<number, string>; nota: string };

export const VENTA_VACIA: Venta = { cantidades: {}, precios: {}, nota: "" };

// Cuántas unidades se pueden vender como máximo
export const tope = (p: Producto) => p.stock ?? Infinity;

// Copia sin la entrada de un producto
function sin<T>(registro: Record<number, T>, id: number) {
  const copia = { ...registro };
  delete copia[id];
  return copia;
}

// Una venta guardada pudo quedar con más unidades de las que hay ahora: cuenta hasta el stock
export const cantidadEn = (venta: Venta, p: Producto) => Math.min(venta.cantidades[p.id] ?? 0, Math.max(0, tope(p)));

// La venta con n unidades del producto, ajustadas al stock. Con 0 sale del carrito y vuelve a su
// precio de lista.
export function conCantidad(venta: Venta, p: Producto, n: number): Venta {
  const cant = Math.max(0, Math.min(tope(p), n || 0));
  if (cant) return { ...venta, cantidades: { ...venta.cantidades, [p.id]: cant } };
  return { ...venta, cantidades: sin(venta.cantidades, p.id), precios: sin(venta.precios, p.id) };
}

// Precio que se cobra: el de lista o uno menor (un descuento). null si lo escrito no es válido.
export function precioCobrado(venta: Venta, p: Producto) {
  const texto = venta.precios[p.id];
  if (texto === undefined) return p.precio;
  const n = Number(texto);
  return texto.trim() !== "" && n >= 0 && n <= p.precio ? n : null;
}

// Categorías del filtro, en el orden en que llegan los productos (ya vienen ordenados)
export const categoriasDe = (productos: Producto[]) => [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

// Los productos de la categoría elegida que coinciden con la búsqueda, por nombre o categoría
export function filtrarProductos(productos: Producto[], busqueda: string, categoria: string | null) {
  const q = busqueda.trim().toLowerCase();
  const enCategoria = (p: Producto) => !categoria || p.categoria === categoria;
  const coincide = (p: Producto) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(q);
  return productos.filter((p) => enCategoria(p) && coincide(p));
}

// Una línea del tiquete; precio null si lo escrito no es válido
export type Linea = { producto: Producto; cantidad: number; precio: number | null };

// La venta como se registra. Los productos que ya no existen o se desactivaron no aparecen aunque
// sigan en la venta guardada.
export function resumenVenta(productos: Producto[], venta: Venta) {
  const lineas: Linea[] = productos
    .map((p) => ({ producto: p, cantidad: cantidadEn(venta, p), precio: precioCobrado(venta, p) }))
    .filter((l) => l.cantidad > 0);
  // Mientras haya un precio inválido, esa línea cuenta a precio de lista
  const cobrado = (l: Linea) => l.precio ?? l.producto.precio;
  return {
    lineas,
    preciosValidos: lineas.every((l) => l.precio !== null),
    total: lineas.reduce((t, l) => t + cobrado(l) * l.cantidad, 0),
    descuento: lineas.reduce((t, l) => t + (l.producto.precio - cobrado(l)) * l.cantidad, 0),
    unidades: lineas.reduce((t, l) => t + l.cantidad, 0),
  };
}
export type Resumen = ReturnType<typeof resumenVenta>;

// Lo que se envía a registrarVenta (con los precios ya válidos): precio_unitario solo si hay descuento
export const itemsVenta = (lineas: Linea[]): ItemVenta[] =>
  lineas.map(({ producto, cantidad, precio }) => ({
    producto_id: producto.id,
    cantidad,
    precio_unitario: precio !== null && precio < producto.precio ? precio : undefined,
  }));

export const textoUnidades = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

export function textoBotonVenta({ enviando, unidades, preciosValidos, enLinea }: { enviando: boolean; unidades: number; preciosValidos: boolean; enLinea: boolean }) {
  if (enviando) return "Registrando…";
  if (!unidades) return "Selecciona productos";
  if (!preciosValidos) return "Revisa los precios";
  return enLinea ? "Registrar venta" : "Sin conexión";
}

// Venta guardada en el celular (JSON). Solo cuenta la del día y completa; si no, vacía.
export function ventaDesdeTexto(texto: string | null, dia: string): Venta {
  try {
    const guardada = JSON.parse(texto ?? "null");
    if (guardada?.dia === dia && guardada.cantidades && guardada.precios) {
      return { cantidades: guardada.cantidades, precios: guardada.precios, nota: String(guardada.nota ?? "") };
    }
  } catch {
    // Datos dañados: se empieza de cero
  }
  return VENTA_VACIA;
}

// Sin unidades ni nota no hay nada que guardar
export const esVentaVacia = (venta: Venta) => !Object.values(venta.cantidades).some((n) => n > 0) && !venta.nota.trim();
