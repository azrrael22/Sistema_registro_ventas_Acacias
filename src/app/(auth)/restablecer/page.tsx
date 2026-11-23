import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase";
import { enRecuperacion } from "@/server/recuperacion";
import { Etiqueta } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { EntradaContrasena } from "@/components/entrada-contrasena";
import { restablecerContrasena } from "../actions";

export const metadata: Metadata = { title: "Contraseña nueva" };

// Se llega desde el enlace del correo de recuperación (auth/callback), que abre la sesión y deja la
// cookie de recuperación. Sin sesión, el proxy manda a /login; sin la cookie, a pedir otro enlace.
export default async function RestablecerPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!(await enRecuperacion(data?.claims?.sub))) redirect("/recuperar?error=enlace");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-medium text-stone-900 dark:text-stone-50">Crea una contraseña nueva</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Al guardarla entrarás a la app con ella.</p>
      </div>
      <FormAccion accion={restablecerContrasena} className="flex flex-col gap-4">
        <Etiqueta texto="Contraseña nueva">
          <EntradaContrasena name="password" required minLength={8} autoComplete="new-password" aria-describedby="pista-contrasena" />
        </Etiqueta>
        {/* Fuera de la etiqueta para no sumarse al nombre del campo; -mt-3 la deja a 4 px del campo */}
        <p id="pista-contrasena" className="-mt-3 text-xs text-stone-500 dark:text-stone-400">
          Al menos 8 caracteres
        </p>
        <Etiqueta texto="Confirmar contraseña nueva">
          <EntradaContrasena name="confirmar" required autoComplete="new-password" />
        </Etiqueta>
        <BotonEnvio>Guardar contraseña</BotonEnvio>
      </FormAccion>
    </div>
  );
}
