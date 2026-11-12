"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase";

export async function marcarTodasLeidas() {
  const supabase = await createClient();
  await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  revalidatePath("/", "layout");
}
