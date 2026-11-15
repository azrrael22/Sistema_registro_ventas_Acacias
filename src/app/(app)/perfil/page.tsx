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

const subtitulo = "mb-4 font-medium text-stone-900 dark:text-stone-50";
const dato = "text-sm text-stone-600 dark:text-stone-400";

export default async function PerfilPage() {
  const yo = await requerirEmpleadoActivo();
  const supabase = await createClient();
  // new_email: cambio de correo que todavía no se ha confirmado
  const { data } = await supabase.auth.getUser();
  const correoPendiente = data.user?.new_email;

  return (
    <>
      <Titulo descripcion="Cambia tu nombre, tu correo o tu contraseña.">Mi perfil</Titulo>
      <div className="flex max-w-xl flex-col gap-4">
        <Tarjeta>
          <h2 className={subtitulo}>Datos personales</h2>
          <FormAccion accion={actualizarNombre} className="flex flex-col gap-3">
            <Etiqueta texto="Nombre">
              <Entrada name="nombre" required maxLength={80} defaultValue={yo.nombre} autoComplete="name" />
            </Etiqueta>
            <BotonEnvio variante="secundario" className="self-start">Guardar nombre</BotonEnvio>
          </FormAccion>
          <p className={`mt-4 ${dato}`}>
            Documento:{" "}
            {yo.tipo_documento && yo.numero_documento ? (
              <span className="font-medium text-stone-900 tabular-nums dark:text-stone-50">{documento(yo.tipo_documento, yo.numero_documento)}</span>
            ) : (
              "sin registrar"
            )}
            . Si hay que corregirlo, pídeselo a un administrador.
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className={subtitulo}>Correo</h2>
          <p className={`mb-3 ${dato}`}>
            Ahora usas <span className="font-medium text-stone-900 dark:text-stone-50">{data.user?.email ?? yo.email}</span>. Ahí te llegan las notificaciones.
          </p>
          {correoPendiente && (
            <div className="mb-3">
              <Aviso tipo="info">Cambio pendiente a {correoPendiente}: abre el enlace que te enviamos a cada correo para terminarlo.</Aviso>
            </div>
          )}
          <FormAccion accion={cambiarCorreo} className="flex flex-col gap-3">
            <Etiqueta texto="Correo nuevo">
              <Entrada name="email" type="email" required autoComplete="email" />
            </Etiqueta>
            <BotonEnvio variante="secundario" pendiente="Enviando…" className="self-start">Cambiar correo</BotonEnvio>
          </FormAccion>
        </Tarjeta>

        <Tarjeta>
          <h2 className={subtitulo}>Contraseña</h2>
          <FormAccion accion={cambiarContrasena} className="flex flex-col gap-3">
            <Etiqueta texto="Contraseña actual">
              <EntradaContrasena name="actual" required autoComplete="current-password" />
            </Etiqueta>
            <Etiqueta texto="Contraseña nueva">
              <EntradaContrasena name="password" required minLength={8} autoComplete="new-password" />
            </Etiqueta>
            <Etiqueta texto="Confirmar contraseña nueva">
              <EntradaContrasena name="confirmar" required autoComplete="new-password" />
            </Etiqueta>
            <BotonEnvio variante="secundario" className="self-start">Cambiar contraseña</BotonEnvio>
          </FormAccion>
        </Tarjeta>
      </div>
    </>
  );
}
