import { Marca } from "@/components/marca";

// Pantalla suelta, fuera de la app (cuenta pendiente, página no encontrada, error al cargar):
// el logo, un título y lo que siga, centrados.
export function PantallaCentrada({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Marca className="size-10" />
        <h1 className="mt-4 text-2xl font-medium text-stone-900 dark:text-stone-50">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
