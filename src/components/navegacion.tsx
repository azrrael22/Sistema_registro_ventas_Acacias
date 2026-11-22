"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";
import { IconoMas, IconoRecibo, IconoEtiqueta, IconoCaja, IconoBilletes, IconoGrafica, IconoSocios } from "@/components/iconos";
import type { ComponentProps } from "react";

type Icono = (props: ComponentProps<"svg">) => React.ReactElement;

const enlaces: { href: string; texto: string; icono: Icono }[] = [
  { href: "/ventas/nueva", texto: "Vender", icono: IconoMas },
  { href: "/ventas", texto: "Ventas", icono: IconoRecibo },
  { href: "/productos", texto: "Productos", icono: IconoEtiqueta },
  { href: "/inventario", texto: "Inventario", icono: IconoCaja },
  { href: "/retiros", texto: "Retiros", icono: IconoBilletes },
  { href: "/reportes", texto: "Reportes", icono: IconoGrafica },
];

export function Navegacion({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const todos = esAdmin ? [...enlaces, { href: "/admin/empleados", texto: "Empleados", icono: IconoSocios }] : enlaces;
  // El enlace activo es el de prefijo más largo (así /ventas/nueva no marca también /ventas)
  const activo = todos
    .filter((e) => ruta === e.href || ruta.startsWith(e.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="mx-auto max-w-5xl overflow-x-auto px-1 sm:px-3">
      <ul className="flex text-sm whitespace-nowrap">
        {todos.map(({ href, texto, icono: Icono }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={activo === href ? "page" : undefined}
              className={cx(
                "relative flex items-center gap-1.5 px-3 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-500",
                activo === href
                  ? "text-emerald-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-emerald-700 dark:text-emerald-400 dark:after:bg-emerald-400"
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50",
              )}
            >
              <Icono className="size-4 shrink-0" />
              <span>{texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
