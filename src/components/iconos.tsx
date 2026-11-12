import type { ComponentProps } from "react";
import { cx } from "@/components/ui";

type Props = ComponentProps<"svg">;

// Iconos de línea con trazos de lucide: todos a 18 px y con el mismo grosor.
function Icono({ className, children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("size-4.5 shrink-0", className)}
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconoMas(props: Props) {
  return (
    <Icono {...props}>
      <path d="M5 12h14M12 5v14" />
    </Icono>
  );
}

export function IconoMenos(props: Props) {
  return (
    <Icono {...props}>
      <path d="M5 12h14" />
    </Icono>
  );
}

export function IconoFlecha(props: Props) {
  return (
    <Icono {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icono>
  );
}

export function IconoOjo(props: Props) {
  return (
    <Icono {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icono>
  );
}

export function IconoOjoTachado(props: Props) {
  return (
    <Icono {...props}>
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7" />
      <path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </Icono>
  );
}

export function IconoCampana(props: Props) {
  return (
    <Icono {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icono>
  );
}

export function IconoBilletes(props: Props) {
  return (
    <Icono {...props}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </Icono>
  );
}

export function IconoSocios(props: Props) {
  return (
    <Icono {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icono>
  );
}

export function IconoPersonaNueva(props: Props) {
  return (
    <Icono {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </Icono>
  );
}

export function IconoAprobado(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Icono>
  );
}
