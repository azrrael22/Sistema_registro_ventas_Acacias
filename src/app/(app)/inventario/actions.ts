"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { mensajeError } from "@/lib/formato";
import type { Resultado } from "@/lib/acciones";

export async function registrarMovimiento(_: Resultado, form: FormData): Promise<Resultado> {
  await requerirEmpleadoActivo();
  const tipo = form.get("tipo") === "ajuste" ? "ajuste" : "entrada";
  const cantidad = Number(form.get("cantidad"));
  if (!Number.isInteger(cantidad) || cantidad === 0) return { error: "La cantidad debe ser un número entero distinto de 0" };
  if (tipo === "entrada" && cantidad < 0) return { error: "Una entrada debe ser positiva. Usa un ajuste para restar." };
  const supabase = await createClient();
  const { error } = await supabase.from("inventario_movimientos").insert({
    producto_id: Number(form.get("producto_id")),
    tipo,
    cantidad,
    nota: String(form.get("nota") ?? "").trim() || null,
  });
  if (error) return { error: mensajeError(error)! };
  revalidatePath("/", "layout");
  return { ok: "Movimiento registrado" };
}
