import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { documento } from "@/lib/documentos";
import { Aviso, Entrada, Etiqueta, Tarjeta, Titulo } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { EntradaContrasena } from "@/components/entrada-contrasena";
import { actualizarNombre, cambiarContrasena, cambiarCorreo } from "./actions";

export const metadata: Metadata = { title: "Mi perfil" };

// En escritorio, cada sección va en dos columnas: título y explicación a la izquierda, tarjeta a la derecha
function Seccion({ titulo, explicacion, children }: { titulo: string; explicacion: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 lg:grid-cols-[16rem_minmax(0,36rem)] lg:gap-8">
      <div>
        <h2 className="font-medium text-stone-900 dark:text-stone-50">{titulo}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{explicacion}</p>
      </div>
      <Tarjeta>{children}</Tarjeta>
    </section>
  );
}

// Lo que no se edita aquí se muestra como dato, con la misma etiqueta que los campos
function Dato({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium text-stone-700 dark:text-stone-300">{etiqueta}</p>
      <p className="text-stone-900 dark:text-stone-50">{children}</p>
      {ayuda && <p className="text-xs text-stone-500 dark:text-stone-400">{ayuda}</p>}
    </div>
  );
}

export default async function PerfilPage() {
  const yo = await requerirEmpleadoActivo();
  const supabase = await createClient();
  // new_email: cambio de correo que todavía no se ha confirmado
  const { data } = await supabase.auth.getUser();
  const correoPendiente = data.user?.new_email;

  return (
    <>
      <Titulo>Mi perfil</Titulo>
      <div className="flex flex-col gap-8">
        <Seccion titulo="Datos personales" explicacion="Así te ven los demás en ventas, retiros e inventario">
          <div className="flex flex-col gap-4">
            <Dato etiqueta="Documento" ayuda="Para corregirlo, pídeselo a un administrador">
              {yo.tipo_documento && yo.numero_documento ? (
                <span className="tabular-nums">{documento(yo.tipo_documento, yo.numero_documento)}</span>
              ) : (
                <span className="text-stone-500 dark:text-stone-400">Sin registrar</span>
              )}
            </Dato>
            <FormAccion accion={actualizarNombre} className="flex flex-col gap-3">
              <Etiqueta texto="Nombre">
                <Entrada name="nombre" required maxLength={80} defaultValue={yo.nombre} autoComplete="name" />
              </Etiqueta>
              <BotonEnvio variante="secundario" className="self-start">Guardar nombre</BotonEnvio>
            </FormAccion>
          </div>
        </Seccion>

        <Seccion titulo="Correo" explicacion="Con él ingresas y ahí te llegan las notificaciones">
          <div className="flex flex-col gap-4">
            <Dato etiqueta="Correo actual">{data.user?.email ?? yo.email}</Dato>
            {correoPendiente && <Aviso tipo="info">Cambio pendiente a {correoPendiente}: abre el enlace que te enviamos a cada correo para terminarlo.</Aviso>}
            <FormAccion accion={cambiarCorreo} className="flex flex-col gap-3">
              <Etiqueta texto="Correo nuevo">
                <Entrada name="email" type="email" required autoComplete="email" />
              </Etiqueta>
              <BotonEnvio variante="secundario" pendiente="Enviando…" className="self-start">Cambiar correo</BotonEnvio>
            </FormAccion>
          </div>
        </Seccion>

        <Seccion titulo="Contraseña" explicacion="Se pide la actual para que nadie la cambie desde una sesión que quedó abierta">
          <FormAccion accion={cambiarContrasena} className="flex flex-col gap-3">
            <Etiqueta texto="Contraseña actual">
              <EntradaContrasena name="actual" required autoComplete="current-password" />
            </Etiqueta>
            <Etiqueta texto="Contraseña nueva">
              <EntradaContrasena name="password" required minLength={8} autoComplete="new-password" aria-describedby="pista-contrasena" />
            </Etiqueta>
            {/* Fuera de la etiqueta para no sumarse al nombre del campo; -mt-2 la deja a 4 px del campo */}
            <p id="pista-contrasena" className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
              Al menos 8 caracteres
            </p>
            <Etiqueta texto="Confirmar contraseña nueva">
              <EntradaContrasena name="confirmar" required autoComplete="new-password" />
            </Etiqueta>
            <BotonEnvio variante="secundario" className="self-start">Cambiar contraseña</BotonEnvio>
          </FormAccion>
        </Seccion>
      </div>
    </>
  );
}
