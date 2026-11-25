// Productos del catálogo: lo que se lee del formulario al crearlos y al editarlos.
import { numero, texto } from "@/lib/formulario";

const SIN_NOMBRE = "Escribe el nombre del producto";

type Base = { nombre: string; precio: number; maneja_inventario: boolean };
export type ProductoNuevo = Base & { categoria_id: number };
export type CambiosProducto = { id: number; datos: Base & { activo: boolean } };

// Campos comunes a crear y editar
function leerBase(form: FormData): Base {
  return {
    nombre: texto(form, "nombre").trim(),
    precio: numero(form, "precio"),
    maneja_inventario: form.get("maneja_inventario") === "on",
  };
}

// Un producto nuevo necesita nombre y precio
export function leerProductoNuevo(form: FormData): ProductoNuevo | { error: string } {
  const base = leerBase(form);
  if (!base.nombre) return { error: SIN_NOMBRE };
  if (!Number.isFinite(base.precio) || base.precio <= 0) return { error: "El precio debe ser mayor que 0" };
  return { ...base, categoria_id: Number(form.get("categoria_id")) };
}

// Al editar, el precio puede quedar en 0 solo si el producto está inactivo
export function leerCambiosProducto(form: FormData): CambiosProducto | { error: string } {
  const base = leerBase(form);
  const activo = form.get("activo") === "on";
  if (!base.nombre) return { error: SIN_NOMBRE };
  if (!Number.isFinite(base.precio) || base.precio < 0) return { error: "Precio inválido" };
  if (activo && base.precio === 0) return { error: "Asigna un precio antes de activar el producto" };
  return { id: Number(form.get("id")), datos: { ...base, activo } };
}
