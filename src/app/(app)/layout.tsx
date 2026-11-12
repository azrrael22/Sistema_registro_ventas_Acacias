import Link from "next/link";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { createClient } from "@/server/supabase";
import { Navegacion } from "@/components/navegacion";
import { Campanita } from "@/components/campanita";
import { Marca } from "@/components/marca";
import { cerrarSesion } from "../(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-medium text-stone-900">
            <Marca className="size-5" /> Las Acacias
          </Link>
          <div className="flex items-center gap-1">
            <Campanita empleadoId={empleado.id} sinLeer={count ?? 0} />
            <span className="hidden px-2 text-sm text-stone-600 sm:inline">{empleado.nombre}</span>
            <form action={cerrarSesion}>
              <button className="h-9 rounded-lg px-3 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900">Salir</button>
            </form>
          </div>
        </div>
        <Navegacion esAdmin={empleado.es_admin} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
