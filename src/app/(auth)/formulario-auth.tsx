"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { Aviso, Entrada, Etiqueta } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { EntradaContrasena } from "@/components/entrada-contrasena";
import { CamposDocumento } from "@/components/campos-documento";
import { CamposNombre } from "@/components/campos-nombre";
import { tipoDocumento } from "@/lib/documentos";
import { atraparFallos } from "@/lib/acciones";
import { rutaInterna } from "@/lib/rutas";
import { iniciarSesion, registrarse } from "./actions";

type Modo = "login" | "registro";
type Valores = Record<string, string> | undefined;

// Lo que cambia entre ingresar y registrarse
const MODOS = {
  login: {
    accion: iniciarSesion,
    boton: "Ingresar",
    contrasena: { autoComplete: "current-password", minLength: undefined },
    pie: { pregunta: "¿No tienes cuenta?", enlace: "Regístrate", href: "/registro" },
  },
  registro: {
    accion: registrarse,
    boton: "Crear cuenta",
    contrasena: { autoComplete: "new-password", minLength: 8 },
    pie: { pregunta: "¿Ya tienes cuenta?", enlace: "Ingresa", href: "/login" },
  },
} as const;

// Estado de la acción y, si ya ingresó con un destino, la ruta a la que se va
function useEstadoAuth(modo: Modo) {
  const [estado, accion] = useActionState(atraparFallos(MODOS[modo].accion), undefined);
  // Ingresó y tenía destino: navegación completa, para que el navegador siga las redirecciones
  // del destino con la URL correcta (ver iniciarSesion). replace: «atrás» no vuelve al login.
  const ir = rutaInterna(estado?.ir);
  useEffect(() => {
    if (ir) window.location.replace(ir);
  }, [ir]);
  return { estado, accion, ir };
}

// `destino`: pantalla a la que se vuelve después de ingresar (?destino= del login, ya validado)
export function FormularioAuth({ modo, destino }: { modo: Modo; destino?: string }) {
  const { estado, accion, ir } = useEstadoAuth(modo);
  if (estado?.ok) return <Aviso tipo="ok">{estado.ok}</Aviso>;

  // Lo que se envió, para que un error no vacíe el formulario
  const v = estado?.valores;
  const registro = modo === "registro";
  return (
    <form action={accion} className="flex flex-col gap-4">
      {registro ? <CamposRegistro valores={v} /> : <Destino valor={destino} />}
      <Etiqueta texto="Correo">
        <Entrada name="email" type="email" required autoComplete="email" defaultValue={v?.email} />
      </Etiqueta>
      <Etiqueta texto="Contraseña">
        <EntradaContrasena name="password" required {...MODOS[modo].contrasena} />
      </Etiqueta>
      {registro ? <ConfirmarContrasena /> : <EnlaceOlvido />}
      <Aviso>{estado?.error}</Aviso>
      {/* Mientras el navegador va al destino, el botón no vuelve a quedar disponible */}
      <BotonEnvio pendiente="Un momento…" disabled={Boolean(ir)}>
        {ir ? "Entrando…" : MODOS[modo].boton}
      </BotonEnvio>
      <Pie {...MODOS[modo].pie} />
    </form>
  );
}

function Destino({ valor }: { valor?: string }) {
  return valor ? <input type="hidden" name="destino" value={valor} /> : null;
}

function CamposRegistro({ valores: v }: { valores: Valores }) {
  return (
    <>
      <CamposNombre valores={v} />
      <CamposDocumento tipo={tipoDocumento(v?.tipo_documento)} numero={v?.numero_documento} />
    </>
  );
}

function ConfirmarContrasena() {
  return (
    <Etiqueta texto="Confirmar contraseña">
      <EntradaContrasena name="confirmar" required autoComplete="new-password" />
    </Etiqueta>
  );
}

function EnlaceOlvido() {
  return (
    <Link
      href="/recuperar"
      className="-mt-2 self-end rounded-md py-1 text-sm font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700 pointer-coarse:py-2.5 dark:text-emerald-400 dark:focus-visible:outline-emerald-500"
    >
      ¿Olvidaste tu contraseña?
    </Link>
  );
}

function Pie({ pregunta, enlace, href }: { pregunta: string; enlace: string; href: string }) {
  return (
    <p className="text-center text-sm text-stone-600 dark:text-stone-400">
      {pregunta}{" "}
      <Link className="font-medium text-emerald-700 hover:underline dark:text-emerald-400" href={href}>
        {enlace}
      </Link>
    </p>
  );
}
