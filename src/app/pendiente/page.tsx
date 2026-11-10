import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEmpleado } from "@/lib/sesion";
import { Boton } from "@/components/ui";
import { cerrarSesion } from "../(auth)/actions";

export const metadata: Metadata = { title: "Cuenta pendiente" };

export default async function PendientePage() {
  const empleado = await getEmpleado();
  if (!empleado) redirect("/login");
  if (empleado.activo) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-3xl" aria-hidden>⏳</p>
        <h1 className="mt-2 text-lg font-semibold">Hola, {empleado.nombre}</h1>
        <p className="mt-2 text-sm text-stone-600">
          Tu cuenta está esperando la aprobación de un administrador. Cuando la aprueben podrás ingresar.
        </p>
        <form action={cerrarSesion} className="mt-6">
          <Boton variante="secundario" className="w-full">Cerrar sesión</Boton>
        </form>
      </div>
    </main>
  );
}
