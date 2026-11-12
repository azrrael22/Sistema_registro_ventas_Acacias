import { cx } from "@/components/ui";

// Logo de Las Acacias: un cuaderno de cuentas con una calculadora delante.
export function Marca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("shrink-0 text-emerald-700", className)} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 19H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3" />
        <path d="M2 6h4M2 10h4M2 14h4M8 6h3" />
      </g>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M13.5 8h7a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 13.5 8ZM14 11.75h6v2.5h-6ZM14 16.75h2.5v2.5H14ZM17.5 16.75H20v2.5h-2.5Z"
      />
    </svg>
  );
}
