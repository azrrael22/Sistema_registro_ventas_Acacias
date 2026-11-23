import Link from "next/link";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { createClient } from "@/server/supabase";
import { Navegacion, NavegacionInferior } from "@/components/navegacion";
import { Campanita } from "@/components/campanita";
import { Marca } from "@/components/marca";
import { EnlacePerfil } from "@/components/enlace-perfil";
import { Aviso, claseBoton } from "@/components/ui";
import { faltanApellidos } from "@/lib/nombres";
import { cerrarSesion } from "../(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const empleado = await requerirEmpleadoActivo();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("leida", false)
    .throwOnError();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Para el teclado: lo primero que se enfoca salta el encabezado y la navegación */}
      <a href="#contenido" className={claseBoton("secundario", "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50")}>
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95 print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-50">
            <Marca className="size-5" /> Las Acacias
          </Link>
          <div className="flex items-center gap-1">
            <Campanita empleadoId={empleado.id} sinLeer={count ?? 0} />
            <EnlacePerfil nombre={empleado.nombre} />
            {/* En celular, Salir está en «Más», lejos de la campana y del perfil */}
            <form action={cerrarSesion} className="max-md:hidden">
              <button className="h-9 cursor-pointer rounded-lg px-3 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-emerald-700 pointer-coarse:h-11 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-50 dark:focus-visible:outline-emerald-500">
                Salir
              </button>
            </form>
          </div>
        </div>
        <Navegacion esAdmin={empleado.es_admin} />
      </header>
      {/* En celular, el relleno de abajo deja ver el final del contenido sobre la navegación fija */}
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] outline-none sm:px-6 sm:pt-8 md:pb-8 print:max-w-none print:p-0"
      >
        {faltanApellidos(empleado) && (
          <div className="mb-6 print:hidden">
            <Aviso tipo="info">
              Faltan tus apellidos.{" "}
              <Link href="/perfil" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">Complétalos en Mi perfil</Link>
            </Aviso>
          </div>
        )}
        {children}
      </main>
      <NavegacionInferior esAdmin={empleado.es_admin} />
    </div>
  );
}
