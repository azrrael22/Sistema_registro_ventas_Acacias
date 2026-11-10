import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fecha } from "@/lib/formato";
import { Boton, Tarjeta, Titulo, Vacio, cx } from "@/components/ui";
import { marcarTodasLeidas } from "./actions";

export const metadata: Metadata = { title: "Notificaciones" };

const ICONOS: Record<string, string> = { retiro: "💸", nuevo_socio: "🤝", registro_pendiente: "🙋", cuenta_aprobada: "✅" };

export default async function NotificacionesPage() {
  const supabase = await createClient();
  const { data: notificaciones } = await supabase
    .from("notificaciones")
    .select("id, tipo, titulo, mensaje, leida, creada_en")
    .order("creada_en", { ascending: false })
    .limit(100);
  const hayNoLeidas = notificaciones?.some((n) => !n.leida);

  return (
    <>
      <Titulo
        accion={
          hayNoLeidas && (
            <form action={marcarTodasLeidas}>
              <Boton variante="secundario">Marcar todas como leídas</Boton>
            </form>
          )
        }
      >
        Notificaciones
      </Titulo>
      {!notificaciones?.length && <Vacio>No tienes notificaciones.</Vacio>}
      <ul className="flex flex-col gap-2">
        {notificaciones?.map((n) => (
          <li key={n.id}>
            <Tarjeta className={cx("flex gap-3", !n.leida && "border-emerald-300 bg-emerald-50/60")}>
              <span className="text-xl" aria-hidden>{ICONOS[n.tipo] ?? "🔔"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {n.titulo} {!n.leida && <span className="ml-1 rounded bg-emerald-700 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">nueva</span>}
                </p>
                <p className="text-sm text-stone-700">{n.mensaje}</p>
                <p className="mt-1 text-xs text-stone-500">{fecha(n.creada_en)}</p>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </>
  );
}
