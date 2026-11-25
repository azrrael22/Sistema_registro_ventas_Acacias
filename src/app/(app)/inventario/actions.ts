"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/errores";
import { leerMovimiento, mensajeConteo, type Movimiento } from "@/lib/inventario";
import type { Resultado } from "@/lib/acciones";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function registrarMovimiento(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const movimiento = leerMovimiento(form);
  if ("error" in movimiento) return movimiento;
  const supabase = await createClient();
  const resultado = movimiento.tipo === "conteo" ? await contar(supabase, movimiento) : await mover(supabase, movimiento);
  if (resultado.ok) revalidatePath("/", "layout");
  return resultado;
}

// Conteo físico: la cantidad es lo que hay en realidad y la base de datos registra la diferencia
async function contar(supabase: Supabase, { producto_id, contadas, nota }: Extract<Movimiento, { tipo: "conteo" }>) {
  const { data: diferencia, error } = await supabase.rpc("registrar_conteo", {
    p_producto: producto_id,
    p_contadas: contadas,
    p_nota: nota ?? undefined,
  });
  return error ? { error: mensajeError(error) } : { ok: mensajeConteo(diferencia) };
}

async function mover(supabase: Supabase, movimiento: Exclude<Movimiento, { tipo: "conteo" }>) {
  const { error } = await supabase.from("inventario_movimientos").insert(movimiento);
  return error ? { error: mensajeError(error) } : { ok: "Movimiento registrado" };
}
