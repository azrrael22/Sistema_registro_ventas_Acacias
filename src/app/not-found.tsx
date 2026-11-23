import type { Metadata } from "next";
import Link from "next/link";
import { claseBoton } from "@/components/ui";
import { PantallaCentrada } from "@/components/pantalla-centrada";

export const metadata: Metadata = { title: "Página no encontrada" };

// Direcciones que no existen y notFound() (por ejemplo, la devolución de una venta que no existe)
export default function NoEncontrada() {
  return (
    <PantallaCentrada titulo="No encontramos esta página">
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Puede que el enlace esté mal escrito o que lo que buscas ya no exista.</p>
      <Link href="/" className={claseBoton("primario", "mt-8 w-full")}>
        Ir al inicio
      </Link>
    </PantallaCentrada>
  );
}
