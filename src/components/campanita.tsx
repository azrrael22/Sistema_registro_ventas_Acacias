"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cx } from "@/components/ui";
import { IconoCampana } from "@/components/iconos";

// Contador de notificaciones sin leer. Al llegar una nueva (Realtime) se
// refresca la página y el servidor vuelve a calcular el contador.
export function Campanita({ empleadoId, sinLeer }: { empleadoId: string; sinLeer: number }) {
  const router = useRouter();
  // En /notificaciones queda marcada, como el enlace del perfil: no es una pestaña de la navegación
  const ruta = usePathname();
  const activa = ruta === "/notificaciones" || ruta.startsWith("/notificaciones/");

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`notificaciones:${empleadoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${empleadoId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [empleadoId, router]);

  return (
    <Link
      href="/notificaciones"
      aria-current={activa ? "page" : undefined}
      className={cx(
        "group relative flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-500",
        // Activa: el mismo escalón de superficie que el hover, no el verde de las pestañas
        activa
          ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50",
      )}
      aria-label={sinLeer ? `Notificaciones (${sinLeer} sin leer)` : "Notificaciones"}
    >
      <IconoCampana />
      {sinLeer > 0 && (
        // El aro del contador toma el color del fondo del botón, para que siempre se vea recortado
        <span
          className={cx(
            "absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] leading-none font-medium text-white tabular-nums ring-2 transition-colors dark:bg-emerald-500",
            activa ? "ring-stone-100 dark:ring-stone-800" : "ring-white group-hover:ring-stone-100 dark:ring-stone-900 dark:group-hover:ring-stone-800",
          )}
        >
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  );
}
