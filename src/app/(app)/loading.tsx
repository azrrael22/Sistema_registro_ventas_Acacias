import { Esqueleto } from "@/components/ui";

// Se ve al instante al cambiar de pantalla (Next la precarga), mientras el servidor trae los datos.
// Sin ella, al tocar una pestaña no pasaba nada hasta que llegaba la página nueva.
export default function Cargando() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando…</span>
      <Esqueleto className="mb-2 h-8 w-48 rounded-lg" />
      <Esqueleto className="h-28" />
      <div className="grid gap-4 md:grid-cols-2">
        <Esqueleto className="h-48" />
        <Esqueleto className="h-48" />
      </div>
    </div>
  );
}
