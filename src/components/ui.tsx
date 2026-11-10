import type { ComponentProps } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variante = "primario" | "secundario" | "peligro" | "fantasma";
const variantes: Record<Variante, string> = {
  primario: "bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-700/50",
  secundario: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:opacity-50",
  peligro: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  fantasma: "text-stone-700 hover:bg-stone-100 disabled:opacity-50",
};

export function Boton({ variante = "primario", className, ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        variantes[variante],
        className,
      )}
      {...props}
    />
  );
}

const campo =
  "min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(campo, className)} {...props} />;
}

export function Selector({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(campo, className)} {...props} />;
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
  return <section className={cx("rounded-xl border border-stone-200 bg-white p-4 shadow-sm", className)} {...props} />;
}

export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-semibold text-stone-900">{children}</h1>
      {accion}
    </div>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "ok" | "info"; children: React.ReactNode }) {
  if (!children) return null;
  const estilos = {
    error: "border-red-200 bg-red-50 text-red-800",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={cx("rounded-lg border px-3 py-2 text-sm", estilos[tipo])}>
      {children}
    </p>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">{children}</p>;
}

export { cx };
