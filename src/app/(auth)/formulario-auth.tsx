"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Entrada, Etiqueta } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { EntradaContrasena } from "@/components/entrada-contrasena";
import { CamposDocumento } from "@/components/campos-documento";
import { CamposNombre } from "@/components/campos-nombre";
import type { TipoDocumento } from "@/lib/documentos";
import { atraparFallos } from "@/lib/acciones";
import { iniciarSesion, registrarse } from "./actions";

export function FormularioAuth({ modo }: { modo: "login" | "registro" }) {
  const [estado, accion] = useActionState(atraparFallos(modo === "login" ? iniciarSesion : registrarse), undefined);

  if (estado?.ok) return <Aviso tipo="ok">{estado.ok}</Aviso>;

  // Lo que se envió, para que un error no vacíe el formulario
  const v = estado?.valores;

  return (
    <form action={accion} className="flex flex-col gap-4">
      {modo === "registro" && (
        <>
          <CamposNombre valores={v} />
          <CamposDocumento tipo={v?.tipo_documento as TipoDocumento | undefined} numero={v?.numero_documento} />
        </>
      )}
      <Etiqueta texto="Correo">
        <Entrada name="email" type="email" required autoComplete="email" defaultValue={v?.email} />
      </Etiqueta>
      <Etiqueta texto="Contraseña">
        <EntradaContrasena
          name="password"
          required
          minLength={modo === "registro" ? 8 : undefined}
          autoComplete={modo === "login" ? "current-password" : "new-password"}
        />
      </Etiqueta>
      {modo === "login" && (
        <Link
          href="/recuperar"
          className="-mt-2 self-end rounded-md py-1 text-sm font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700 pointer-coarse:py-2.5 dark:text-emerald-400 dark:focus-visible:outline-emerald-500"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      )}
      {modo === "registro" && (
        <Etiqueta texto="Confirmar contraseña">
          <EntradaContrasena name="confirmar" required autoComplete="new-password" />
        </Etiqueta>
      )}
      <Aviso>{estado?.error}</Aviso>
      <BotonEnvio pendiente="Un momento…">{modo === "login" ? "Ingresar" : "Crear cuenta"}</BotonEnvio>
      <p className="text-center text-sm text-stone-600 dark:text-stone-400">
        {modo === "login" ? (
          <>¿No tienes cuenta? <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href="/registro">Regístrate</Link></>
        ) : (
          <>¿Ya tienes cuenta? <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href="/login">Ingresa</Link></>
        )}
      </p>
    </form>
  );
}
