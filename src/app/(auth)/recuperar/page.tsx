import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Entrada, Etiqueta } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { solicitarRecuperacion } from "../actions";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecuperarPage({ searchParams }: PageProps<"/recuperar">) {
  // auth/callback manda aquí cuando el enlace del correo venció o ya se usó
  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-stone-900 dark:text-stone-50">Recupera tu contraseña</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Escribe el correo con el que ingresas y te enviaremos un enlace para crear una contraseña nueva.
        </p>
      </div>
      {error === "enlace" && <Aviso>El enlace venció o ya se usó. Pide uno nuevo.</Aviso>}
      <FormAccion accion={solicitarRecuperacion} className="flex flex-col gap-4">
        <Etiqueta texto="Correo">
          <Entrada name="email" type="email" required autoComplete="email" />
        </Etiqueta>
        <BotonEnvio pendiente="Enviando…">Enviar enlace</BotonEnvio>
      </FormAccion>
      <p className="text-center text-sm text-stone-600 dark:text-stone-400">
        ¿La recordaste?{" "}
        <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href="/login">
          Ingresa
        </Link>
      </p>
    </div>
  );
}
