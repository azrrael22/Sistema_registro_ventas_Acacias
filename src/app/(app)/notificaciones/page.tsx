import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { fecha } from "@/lib/formato";
import { destinoNotificacion } from "@/lib/notificaciones";
import { Tarjeta, Titulo, Vacio, cx } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { IconoAprobado, IconoBilletes, IconoCampana, IconoFlecha, IconoPersonaNueva, IconoSocios } from "@/components/iconos";
import { abrirNotificacion, marcarTodasLeidas } from "./actions";
import { BotonFila } from "./boton-fila";

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
    .select("id, tipo, titulo, mensaje, datos, leida, creada_en")
    .order("creada_en", { ascending: false })
    .limit(100)
    .throwOnError();
  const hayNoLeidas = notificaciones?.some((n) => !n.leida);

  return (
    <>
      <Titulo
        descripcion={notificaciones?.length ? "Toca una notificación para ir a su pantalla; queda marcada como leída." : undefined}
        accion={
          hayNoLeidas && (
            <FormAccion accion={marcarTodasLeidas} claseAviso="mt-2">
              <BotonEnvio variante="secundario" pendiente="Marcando…">
                Marcar todas como leídas
              </BotonEnvio>
            </FormAccion>
          )
        }
      >
        Notificaciones
      </Titulo>
      {!notificaciones?.length ? (
        <Vacio>No tienes notificaciones</Vacio>
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <ul className="divide-y divide-stone-100 dark:divide-stone-700">
            {notificaciones.map((n) => {
              const Icono = ICONOS[n.tipo] ?? IconoCampana;
              const destino = destinoNotificacion(n.tipo, n.datos);
              // Solo spans: el contenido también va dentro de un <button>
              const contenido = (
                <>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                    <Icono />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("flex items-center gap-2 text-sm", n.leida ? "text-stone-700 dark:text-stone-300" : "font-medium text-stone-900 dark:text-stone-50")}>
                      {n.titulo}
                      {!n.leida && (
                        <>
                          <span className="size-2 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-500" aria-hidden />
                          <span className="sr-only">(sin leer)</span>
                        </>
                      )}
                    </span>
                    <span className="block text-sm text-stone-600 dark:text-stone-400">{n.mensaje}</span>
                    <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">{fecha(n.creada_en)}</span>
                  </span>
                </>
              );
              return (
                <li key={n.id}>
                  {destino ? (
                    <FormAccion accion={abrirNotificacion} claseAviso="px-4 pb-4 sm:px-5">
                      <input type="hidden" name="id" value={n.id} />
                      <BotonFila>
                        {contenido}
                        <IconoFlecha className="self-center text-stone-400 dark:text-stone-500" />
                      </BotonFila>
                    </FormAccion>
                  ) : (
                    <div className="flex gap-3 px-4 py-4 sm:px-5">{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      )}
    </>
  );
}
