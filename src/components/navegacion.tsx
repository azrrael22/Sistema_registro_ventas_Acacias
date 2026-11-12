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
    <nav className="mx-auto max-w-5xl overflow-x-auto px-2">
      <ul className="flex gap-1 pb-2 text-sm whitespace-nowrap">
        {todos.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              aria-current={activo === e.href ? "page" : undefined}
              className={cx(
                "block rounded-lg px-3 py-2 font-medium",
                activo === e.href ? "bg-emerald-50 text-emerald-800" : "text-stone-600 hover:bg-stone-100",
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
