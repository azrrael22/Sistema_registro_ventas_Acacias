import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEmpleado } from "@/server/sesion";
import { Boton } from "@/components/ui";
import { Marca } from "@/components/marca";
import { cerrarSesion } from "../(auth)/actions";

export const metadata: Metadata = { title: "Cuenta pendiente" };

export default async function PendientePage() {
  const empleado = await getEmpleado();
  if (!empleado) redirect("/login");
  if (empleado.activo) redirect("/");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Marca className="size-10" />
        <h1 className="mt-4 text-2xl font-medium text-stone-900">Cuenta pendiente</h1>
        <p className="mt-2 text-sm text-stone-600">
          {empleado.nombre}, tu cuenta está esperando la aprobación de un administrador. Cuando la aprueben podrás ingresar.
        </p>
        <form action={cerrarSesion} className="mt-8">
          <Boton variante="secundario" className="w-full">Cerrar sesión</Boton>
        </form>
      </div>
    </main>
  );
}
