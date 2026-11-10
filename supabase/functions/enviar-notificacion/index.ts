// Envía por correo cada notificación nueva.
// La dispara un Database Webhook de Supabase (INSERT en public.notificaciones).
//
// Secrets necesarios (supabase secrets set ...):
//   RESEND_API_KEY   API key de https://resend.com
//   WEBHOOK_SECRET   mismo valor que el header x-webhook-secret del webhook
//   CORREO_REMITENTE (opcional) p. ej. "Ventas Las Acacias <ventas@tudominio.com>"
//   APP_URL          (opcional) URL pública de la app en Vercel
import { createClient } from "jsr:@supabase/supabase-js@2";

type Notificacion = { id: number; destinatario_id: string; titulo: string; mensaje: string };

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("No autorizado", { status: 401 });
  }

  const { record } = (await req.json()) as { record: Notificacion };
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: empleado } = await supabase
    .from("empleados")
    .select("email, nombre")
    .eq("id", record.destinatario_id)
    .single();
  if (!empleado) return new Response("Destinatario no encontrado", { status: 404 });

  const appUrl = Deno.env.get("APP_URL");
  const enlace = appUrl ? `<p><a href="${appUrl}/notificaciones">Abrir la app</a></p>` : "";
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("CORREO_REMITENTE") ?? "Ventas Las Acacias <onboarding@resend.dev>",
      to: [empleado.email],
      subject: record.titulo,
      html: `<p>Hola ${escapar(empleado.nombre)},</p><p>${escapar(record.mensaje)}</p>${enlace}`,
      text: `Hola ${empleado.nombre},\n\n${record.mensaje}${appUrl ? `\n\n${appUrl}/notificaciones` : ""}`,
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("Resend falló", respuesta.status, detalle);
    return new Response(detalle, { status: 502 });
  }

  await supabase.from("notificaciones").update({ enviada_correo: true }).eq("id", record.id);
  return new Response("ok");
});
