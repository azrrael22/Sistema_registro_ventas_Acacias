"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cx } from "@/components/ui";
import { BotonSalir } from "@/components/boton-salir";
import {
  IconoBilletes,
  IconoCaja,
  IconoEtiqueta,
  IconoGrafica,
  IconoMas,
  IconoPuntos,
  IconoRecibo,
  IconoSalir,
  IconoSocios,
  IconoUsuario,
} from "@/components/iconos";
import { cerrarSesion } from "@/app/(auth)/actions";

type Icono = (props: ComponentProps<"svg">) => React.ReactElement;
type Enlace = { href: string; texto: string; icono: Icono };

const vender: Enlace = { href: "/ventas/nueva", texto: "Vender", icono: IconoMas };
const ventas: Enlace = { href: "/ventas", texto: "Ventas", icono: IconoRecibo };
const productos: Enlace = { href: "/productos", texto: "Productos", icono: IconoEtiqueta };
const inventario: Enlace = { href: "/inventario", texto: "Inventario", icono: IconoCaja };
const retiros: Enlace = { href: "/retiros", texto: "Retiros", icono: IconoBilletes };
const reportes: Enlace = { href: "/reportes", texto: "Reportes", icono: IconoGrafica };
const empleados: Enlace = { href: "/admin/empleados", texto: "Empleados", icono: IconoSocios };
const perfil: Enlace = { href: "/perfil", texto: "Mi perfil", icono: IconoUsuario };

const anillo = "focus-visible:outline-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-500";

// El enlace activo es el de prefijo más largo (así /ventas/nueva no marca también /ventas)
function useActivo(enlaces: Enlace[]) {
  const ruta = usePathname();
  return enlaces
    .filter((e) => ruta === e.href || ruta.startsWith(e.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

// Pestañas bajo el encabezado, desde tablet. En celular la navegación va abajo: NavegacionInferior.
export function Navegacion({ esAdmin }: { esAdmin: boolean }) {
  const todos = [vender, ventas, productos, inventario, retiros, reportes, ...(esAdmin ? [empleados] : [])];
  const activo = useActivo(todos);

  return (
    <nav aria-label="Navegación principal" className="mx-auto max-w-5xl overflow-x-auto px-3 max-md:hidden">
      <ul className="flex text-sm whitespace-nowrap">
        {todos.map(({ href, texto, icono: Icono }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={activo === href ? "page" : undefined}
              className={cx(
                "relative flex items-center gap-1.5 px-3 py-3 font-medium transition-colors focus-visible:-outline-offset-2",
                anillo,
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

// Ícono sobre la etiqueta; la píldora verde detrás del ícono marca la pantalla actual
const claseItem = (activa: boolean) =>
  cx(
    "group flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:-outline-offset-2",
    anillo,
    activa ? "text-emerald-700 dark:text-emerald-400" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50",
  );
const clasePildora = (activa: boolean) =>
  cx(
    "grid h-8 w-14 place-items-center rounded-full transition-colors",
    activa ? "bg-emerald-50 dark:bg-emerald-950" : "group-active:bg-stone-100 dark:group-active:bg-stone-800",
  );
const claseOpcion = "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 font-medium transition-colors";

// Navegación del celular: fija abajo, al alcance del pulgar. Las pantallas que no caben van en «Más»,
// una hoja que sube desde abajo y que también tiene Salir (en celular no está en el encabezado).
export function NavegacionInferior({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  const fijos = [vender, ventas, inventario, retiros];
  const enMas = [productos, reportes, ...(esAdmin ? [empleados] : []), perfil];
  const activo = useActivo([...fijos, ...enMas]);
  const masActiva = enMas.some((e) => e.href === activo);

  // La hoja solo queda abierta en la ruta donde se abrió: al navegar, incluso con «atrás», se cierra sola
  const [abiertaEn, setAbiertaEn] = useState<string | null>(null);
  const abierta = abiertaEn === ruta;
  const cerrar = () => setAbiertaEn(null);
  const hoja = useRef<HTMLDialogElement>(null);

  // showModal() atrapa el foco, deja inerte el resto de la página y cierra con Esc
  useEffect(() => {
    const dialogo = hoja.current;
    if (!dialogo) return;
    if (abierta && !dialogo.open) dialogo.showModal();
    if (!abierta && dialogo.open) dialogo.close();
  }, [abierta]);

  return (
    <>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden print:hidden dark:border-stone-700 dark:bg-stone-900/95"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {fijos.map(({ href, texto, icono: Icono }) => (
            <li key={href}>
              <Link href={href} aria-current={activo === href ? "page" : undefined} className={claseItem(activo === href)}>
                <span className={clasePildora(activo === href)}>
                  <Icono className="size-5" />
                </span>
                {texto}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setAbiertaEn(ruta)}
              aria-haspopup="dialog"
              aria-expanded={abierta}
              aria-controls="hoja-mas"
              className={cx(claseItem(masActiva), "cursor-pointer")}
            >
              <span className={clasePildora(masActiva)}>
                <IconoPuntos className="size-5" />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>

      {/* Tocar el fondo oscuro también la cierra: ese clic le llega al propio <dialog>, porque
          todo lo de adentro está en el div. Sube desde abajo (sin animación con movimiento reducido). */}
      <dialog
        ref={hoja}
        id="hoja-mas"
        aria-labelledby="titulo-mas"
        onClose={cerrar}
        onClick={(e) => e.target === e.currentTarget && cerrar()}
        className="inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-0 text-stone-900 shadow-xl transition-[translate] duration-200 ease-out backdrop:bg-stone-950/40 starting:open:translate-y-full motion-reduce:transition-none print:hidden dark:bg-stone-800 dark:text-stone-50"
      >
        <div className="px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" aria-hidden />
          <h2 id="titulo-mas" className="px-3 pb-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            Más
          </h2>
          <ul>
            {enMas.map(({ href, texto, icono: Icono }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={cerrar}
                  aria-current={activo === href ? "page" : undefined}
                  className={cx(
                    claseOpcion,
                    anillo,
                    activo === href
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-stone-700 active:bg-stone-100 dark:text-stone-200 dark:active:bg-stone-700",
                  )}
                >
                  <Icono />
                  {texto}
                </Link>
              </li>
            ))}
          </ul>
          {/* Salir, aparte de las pantallas */}
          <form action={cerrarSesion} className="mt-2 border-t border-stone-200 pt-2 dark:border-stone-700">
            <BotonSalir className={cx(claseOpcion, anillo, "text-stone-700 enabled:active:bg-stone-100 dark:text-stone-200 dark:enabled:active:bg-stone-700")}>
              <IconoSalir />
              Salir
            </BotonSalir>
          </form>
        </div>
      </dialog>
    </>
  );
}
