import Link from "next/link";
import type { ComponentProps } from "react";
import { dinero } from "@/lib/formato";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// La base de .boton, .campo y .tarjeta está en globals.css; aquí solo van las variantes.
type Variante = "primario" | "secundario" | "peligro" | "fantasma";
const variantes: Record<Variante, string> = {
  primario: "bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-500",
  secundario: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:opacity-50",
  peligro: "border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50",
  fantasma: "text-stone-700 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50",
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
        <h1 className="text-2xl font-medium text-stone-900">{children}</h1>
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
    error: "border-red-200 bg-red-50 text-red-800",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-stone-200 bg-stone-50 text-stone-700",
  };
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2 text-sm", estilos[tipo])}>
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-stone-100 px-6 py-8 text-center text-sm text-stone-600">{children}</p>;
}

export { cx };
