import Link from "next/link";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { createClient } from "@/server/supabase";
import { Navegacion } from "@/components/navegacion";
import { Campanita } from "@/components/campanita";
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
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🌳</span> Las Acacias
          </Link>
          <div className="flex items-center gap-1">
            <Campanita empleadoId={empleado.id} sinLeer={count ?? 0} />
            <span className="hidden text-sm text-stone-600 sm:inline">{empleado.nombre}</span>
            <form action={cerrarSesion}>
              <button className="rounded-lg px-2 py-2 text-sm text-stone-600 hover:bg-stone-100">Salir</button>
            </form>
          </div>
        </div>
        <Navegacion esAdmin={empleado.es_admin} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
