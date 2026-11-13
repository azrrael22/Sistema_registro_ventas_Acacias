"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Entrada, Etiqueta } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { EntradaContrasena } from "@/components/entrada-contrasena";
import { CamposDocumento } from "@/components/campos-documento";
import { iniciarSesion, registrarse } from "./actions";

export function FormularioAuth({ modo }: { modo: "login" | "registro" }) {
  const [estado, accion] = useActionState(modo === "login" ? iniciarSesion : registrarse, undefined);

  if (estado?.ok) return <Aviso tipo="ok">{estado.ok}</Aviso>;

  return (
    <form action={accion} className="flex flex-col gap-4">
      {modo === "registro" && (
        <>
          <Etiqueta texto="Nombre">
            <Entrada name="nombre" required autoComplete="name" />
          </Etiqueta>
          <CamposDocumento />
        </>
      )}
      <Etiqueta texto="Correo">
        <Entrada name="email" type="email" required autoComplete="email" />
      </Etiqueta>
      <Etiqueta texto="Contraseña">
        <EntradaContrasena
          name="password"
          required
          minLength={modo === "registro" ? 8 : undefined}
          autoComplete={modo === "login" ? "current-password" : "new-password"}
        />
      </Etiqueta>
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
