import Link from "next/link";
import type { ComponentProps } from "react";
import { dinero } from "@/lib/formato";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// La base de .boton, .campo y .tarjeta está en globals.css; aquí solo van las variantes.
type Variante = "primario" | "secundario" | "peligro" | "fantasma";
const variantes: Record<Variante, string> = {
  primario: "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none disabled:active:scale-100",
  secundario: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 active:bg-stone-100 disabled:opacity-50",
  peligro: "border border-red-200 bg-white text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-50",
  fantasma: "text-stone-700 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 disabled:opacity-50",
};

// También para enlaces que se ven como botón
export const claseBoton = (variante: Variante = "primario", className?: string) => cx("boton", variantes[variante], className);

export function Boton({ variante = "primario", className, ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={claseBoton(variante, className)} {...props} />;
}

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx("campo", className)} {...props} />;
}

export function Selector({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx("campo", className)} {...props} />;
}

export function Etiqueta({ texto, children, className }: { texto: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1 text-sm font-medium text-stone-700", className)}>
      {texto}
      {children}
    </label>
  );
}

export function Tarjeta({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("tarjeta", className)} {...props} />;
}

export function Titulo({ children, descripcion, accion }: { children: React.ReactNode; descripcion?: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{children}</h1>
        {descripcion && <p className="mt-2 max-w-2xl text-sm text-stone-600">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

// Filtros de una página (vistas, periodos): enlaces con forma de control segmentado
export function Pestanas({ etiqueta, opciones }: { etiqueta: string; opciones: { href: string; texto: string; activa: boolean }[] }) {
  return (
    <nav aria-label={etiqueta} className="mb-4 overflow-x-auto print:hidden">
      <ul className="inline-flex gap-1 rounded-lg bg-stone-100 p-1 text-sm whitespace-nowrap">
        {opciones.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={o.activa ? "page" : undefined}
              className={cx(
                "block rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700",
                o.activa ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900",
              )}
            >
              {o.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// El dinero va en mono, como en el tiquete de venta
export function Monto({ valor, className }: { valor: number | string | null | undefined; className?: string }) {
  const n = Number(valor ?? 0);
  return (
    <span className={cx("font-mono tabular-nums", className)}>
      {n < 0 && "−"}
      {dinero(Math.abs(n))}
    </span>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "ok" | "info"; children: React.ReactNode }) {
  if (!children) return null;
  const estilos = {
    error: "border-red-100 bg-red-50 text-red-800 before:bg-red-500",
    ok: "border-emerald-100 bg-emerald-50 text-emerald-800 before:bg-emerald-500",
    info: "border-stone-200 bg-stone-50 text-stone-700 before:bg-stone-400",
  };
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={cx(
        "relative overflow-hidden rounded-lg border pl-4 pr-3 py-2.5 text-sm",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
        estilos[tipo],
      )}
    >
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center text-sm text-stone-500">
      {children}
    </p>
  );
}

type VarianteInsignia = "normal" | "advertencia" | "peligro" | "ok";
const insigniaEstilos: Record<VarianteInsignia, string> = {
  normal: "bg-stone-100 text-stone-700",
  advertencia: "bg-amber-100 text-amber-800",
  peligro: "bg-red-100 text-red-800",
  ok: "bg-emerald-100 text-emerald-800",
};
export function Insignia({ variante = "normal", className, children }: { variante?: VarianteInsignia; className?: string; children: React.ReactNode }) {
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", insigniaEstilos[variante], className)}>
      {children}
    </span>
  );
}

export { cx };
