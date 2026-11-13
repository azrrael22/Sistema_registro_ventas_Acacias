import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { fecha } from "@/lib/formato";
import { Boton, Tarjeta, Titulo, Vacio, cx } from "@/components/ui";
import { IconoAprobado, IconoBilletes, IconoCampana, IconoPersonaNueva, IconoSocios } from "@/components/iconos";
import { marcarTodasLeidas } from "./actions";

export const metadata: Metadata = { title: "Notificaciones" };

const ICONOS: Record<string, typeof IconoCampana> = {
  retiro: IconoBilletes,
  nuevo_socio: IconoSocios,
  registro_pendiente: IconoPersonaNueva,
  cuenta_aprobada: IconoAprobado,
};

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
      {!notificaciones?.length ? (
        <Vacio>No tienes notificaciones</Vacio>
      ) : (
        <Tarjeta className="p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {notificaciones.map((n) => {
              const Icono = ICONOS[n.tipo] ?? IconoCampana;
              return (
                <li key={n.id} className="flex gap-3 px-4 py-4 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                    <Icono />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cx("flex items-center gap-2 text-sm", n.leida ? "text-stone-700 dark:text-stone-300" : "font-medium text-stone-900 dark:text-stone-50")}>
                      {n.titulo}
                      {!n.leida && (
                        <>
                          <span className="size-2 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-500" aria-hidden />
                          <span className="sr-only">(sin leer)</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-400">{n.mensaje}</p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-500">{fecha(n.creada_en)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
