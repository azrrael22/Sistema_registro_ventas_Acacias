import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEmpleado } from "@/server/sesion";
import { Boton } from "@/components/ui";
import { PantallaCentrada } from "@/components/pantalla-centrada";
import { cerrarSesion } from "../(auth)/actions";

export const metadata: Metadata = { title: "Cuenta pendiente" };

export default async function PendientePage() {
  const empleado = await getEmpleado();
  if (!empleado) redirect("/login");
  if (empleado.activo) redirect("/");

  return (
    <PantallaCentrada titulo="Cuenta pendiente">
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        {empleado.nombre}, tu cuenta está esperando la aprobación de un administrador. Cuando la aprueben podrás ingresar.
      </p>
      <form action={cerrarSesion} className="mt-8">
        <Boton variante="secundario" className="w-full">Cerrar sesión</Boton>
      </form>
    </PantallaCentrada>
  );
}
