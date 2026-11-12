"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const enlaces = [
  { href: "/ventas/nueva", texto: "Vender" },
  { href: "/ventas", texto: "Ventas" },
  { href: "/productos", texto: "Productos y socios" },
  { href: "/inventario", texto: "Inventario" },
  { href: "/retiros", texto: "Retiros" },
  { href: "/reportes", texto: "Reportes" },
];

export function Navegacion({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const todos = esAdmin ? [...enlaces, { href: "/admin/empleados", texto: "Empleados" }] : enlaces;
  // El enlace activo es el de prefijo más largo (así /ventas/nueva no marca también /ventas)
  const activo = todos
    .filter((e) => ruta === e.href || ruta.startsWith(e.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mx-auto max-w-5xl overflow-x-auto px-1 sm:px-3">
      <ul className="flex text-sm whitespace-nowrap">
        {todos.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo === e.href ? "page" : undefined}
              className={cx(
                "relative block px-3 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700",
                // La sección activa se marca con una raya verde sobre el borde del encabezado
                activo === e.href
                  ? "text-stone-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-emerald-700"
                  : "text-stone-600 hover:text-stone-900",
              )}
            >
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
