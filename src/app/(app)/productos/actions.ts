"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { aWebp, guardarFoto } from "@/server/fotos";
import { mensajeError } from "@/lib/errores";
import { MAX_FOTO } from "@/lib/fotos";
import type { Resultado } from "@/lib/acciones";

// Foto del formulario convertida a WebP; sin webp ni error si no eligieron ninguna.
async function leerFoto(form: FormData): Promise<{ webp?: Buffer; error?: string }> {
  const foto = form.get("foto");
  if (!(foto instanceof File) || !foto.size) return {};
  if (foto.size > MAX_FOTO) return { error: "La foto pesa más de 4 MB" };
  const webp = await aWebp(foto);
  return webp ? { webp } : { error: "No se pudo leer la imagen. Usa una foto JPG, PNG o WebP" };
}

export async function crearCategoria(_: Resultado, form: FormData): Promise<Resultado> {
  const empleado = await requerirEmpleadoActivo();
  const nombre = String(form.get("nombre")).trim();
  if (!nombre) return { error: "Escribe el nombre de la categoría" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("categorias").insert({ nombre }).select("id").single();
  if (error) return { error: mensajeError(error) };
  if (form.get("ser_socio")) {
    const { error: errorSocio } = await supabase.from("socios").insert({ empleado_id: empleado.id, categoria_id: data.id });
    if (errorSocio) {
      revalidatePath("/productos");
      console.error("No se pudo hacer socio al creador de la categoría:", errorSocio);
      return { error: `Categoría "${nombre}" creada, pero no se pudo hacerte socio. Únete desde la lista.` };
    }
  }
  revalidatePath("/productos");
  return { ok: `Categoría "${nombre}" creada` };
}

export async function crearProducto(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const nombre = String(form.get("nombre")).trim();
  const precio = Number(form.get("precio"));
  const maneja_inventario = form.get("maneja_inventario") === "on";
  if (!nombre) return { error: "Escribe el nombre del producto" };
  if (!Number.isFinite(precio) || precio <= 0) return { error: "El precio debe ser mayor que 0" };
  const foto = await leerFoto(form);
  if (foto.error) return { error: foto.error };
  if (!foto.webp) return { error: "Agrega una foto del producto" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .insert({ nombre, precio, maneja_inventario, categoria_id: Number(form.get("categoria_id")) })
    .select("id")
    .single();
  if (error) return { error: mensajeError(error) };
  const conFoto = await guardarFoto(supabase, data.id, foto.webp, null);
  revalidatePath("/productos");
  if (!conFoto) return { error: `Producto "${nombre}" creado, pero la foto no se pudo subir. Agrégala desde Editar` };
  return { ok: `Producto "${nombre}" creado` };
}

export async function actualizarProducto(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const nombre = String(form.get("nombre")).trim();
  const precio = Number(form.get("precio"));
  const activo = form.get("activo") === "on";
  const maneja_inventario = form.get("maneja_inventario") === "on";
  if (!nombre) return { error: "Escribe el nombre del producto" };
  if (!Number.isFinite(precio) || precio < 0) return { error: "Precio inválido" };
  if (activo && precio === 0) return { error: "Asigna un precio antes de activar el producto" };
  const foto = await leerFoto(form);
  if (foto.error) return { error: foto.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .update({ nombre, precio, activo, maneja_inventario })
    .eq("id", Number(form.get("id")))
    .select("id, foto");
  if (error) return { error: mensajeError(error) };
  if (!data.length) return { error: "Solo los socios de la categoría, quien creó el producto o un admin pueden editarlo" };
  const conFoto = !foto.webp || (await guardarFoto(supabase, data[0].id, foto.webp, data[0].foto));
  // Precio, activo e inventario cambian Vender, Inventario e Inicio, no solo esta pantalla
  revalidatePath("/", "layout");
  if (!conFoto) return { error: "Los datos se guardaron, pero la foto no se pudo subir. Intenta de nuevo" };
  return { ok: "Producto actualizado" };
}

// Sin mensaje de éxito: el botón cambia y la categoría pasa a «Mis categorías»
export async function unirseCategoria(_: Resultado, form: FormData): Promise<Resultado> {
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { error } = await supabase.from("socios").insert({ empleado_id: empleado.id, categoria_id: Number(form.get("categoria_id")) });
  if (error) return { error: error.code === "23505" ? "Ya eres socio de esta categoría" : mensajeError(error) };
  revalidatePath("/", "layout");
}

export async function salirCategoria(_: Resultado, form: FormData): Promise<Resultado> {
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { error } = await supabase
    .from("socios")
    .update({ activo: false, salio_en: new Date().toISOString() })
    .eq("empleado_id", empleado.id)
    .eq("categoria_id", Number(form.get("categoria_id")))
    .eq("activo", true);
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
}
