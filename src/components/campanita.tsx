"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

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
      className="relative rounded-lg p-2 text-stone-600 hover:bg-stone-100"
      aria-label={sinLeer ? `Notificaciones (${sinLeer} sin leer)` : "Notificaciones"}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {sinLeer > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  );
}
