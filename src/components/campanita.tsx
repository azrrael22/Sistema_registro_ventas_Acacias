"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconoCampana } from "@/components/iconos";

// Contador de notificaciones sin leer. Al llegar una nueva (Realtime) se
// refresca la página y el servidor vuelve a calcular el contador.
export function Campanita({ empleadoId, sinLeer }: { empleadoId: string; sinLeer: number }) {
  const router = useRouter();

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
      className="relative flex size-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50"
      aria-label={sinLeer ? `Notificaciones (${sinLeer} sin leer)` : "Notificaciones"}
    >
      <IconoCampana />
      {sinLeer > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] leading-none font-medium text-white tabular-nums ring-2 ring-white dark:bg-emerald-500 dark:ring-stone-900">
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  );
}
