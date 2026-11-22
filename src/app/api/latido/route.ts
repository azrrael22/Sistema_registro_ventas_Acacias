import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Latido diario que programa vercel.json: el plan gratuito de Supabase pausa el proyecto
// tras 7 días sin actividad. Vercel manda "Authorization: Bearer <CRON_SECRET>".
// El proxy no pasa por esta ruta (ver el matcher de src/proxy.ts), así que no hay sesión.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.rpc("latido");
  if (error) {
    console.error("Latido fallido:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, hora: data });
}
