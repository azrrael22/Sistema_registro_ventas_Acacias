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

export function IconoRecibo(props: Props) {
  return (
    <Icono {...props}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M14 8H8M16 12H8M13 16H8" />
    </Icono>
  );
}

export function IconoCaja(props: Props) {
  return (
    <Icono {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </Icono>
  );
}

export function IconoGrafica(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M7 16v-5M11 16v-9M15 16v-3M19 16v-7" />
    </Icono>
  );
}

export function IconoEtiqueta(props: Props) {
  return (
    <Icono {...props}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </Icono>
  );
}

export function IconoImagen(props: Props) {
  return (
    <Icono {...props}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Icono>
  );
}
