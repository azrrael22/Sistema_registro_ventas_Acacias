"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import type { Resultado } from "@/lib/acciones";

export async function registrarMovimiento(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const cantidad = Number(form.get("cantidad"));
  const producto_id = Number(form.get("producto_id"));
  const nota = String(form.get("nota") ?? "").trim() || null;
  const supabase = await createClient();

  // Conteo físico: la cantidad es lo que hay en realidad y la base de datos registra la diferencia
  if (form.get("tipo") === "conteo") {
    if (!Number.isInteger(cantidad) || cantidad < 0) return { error: "Escribe cuántas unidades contaste (0 o más)" };
    const { data: diferencia, error } = await supabase.rpc("registrar_conteo", {
      p_producto: producto_id,
      p_contadas: cantidad,
      p_nota: nota ?? undefined,
    });
    if (error) return { error: mensajeError(error)! };
    revalidatePath("/", "layout");
    if (diferencia === 0) return { ok: "El conteo cuadra con el sistema" };
    if (diferencia === -1) return { ok: "Falta 1 unidad: queda registrada como perdida" };
    if (diferencia < 0) return { ok: `Faltan ${-diferencia} unidades: quedan registradas como perdidas` };
    return { ok: diferencia === 1 ? "Sobra 1 unidad: se sumó al stock" : `Sobran ${diferencia} unidades: se sumaron al stock` };
  }

  const tipo = form.get("tipo") === "ajuste" ? "ajuste" : "entrada";
  if (!Number.isInteger(cantidad) || cantidad === 0) return { error: "La cantidad debe ser un número entero distinto de 0" };
  if (tipo === "entrada" && cantidad < 0) return { error: "Una entrada debe ser positiva. Usa un ajuste para restar." };
  const { error } = await supabase.from("inventario_movimientos").insert({ producto_id, tipo, cantidad, nota });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/", "layout");
  return { ok: "Movimiento registrado" };
}
