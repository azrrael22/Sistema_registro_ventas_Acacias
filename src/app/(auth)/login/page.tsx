import type { Metadata } from "next";
import { Aviso } from "@/components/ui";
import { rutaInterna } from "@/lib/rutas";
import { FormularioAuth } from "../formulario-auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // error: auth/callback manda aquí cuando el enlace para confirmar la cuenta venció o ya se usó.
  // destino: lo pone el proxy cuando alguien sin sesión abre una pantalla (p. ej. desde un correo).
  const { error, destino } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      {error === "enlace" && (
        <Aviso>El enlace del correo venció o ya se usó. Si ya confirmaste tu cuenta, ingresa con tu correo y contraseña.</Aviso>
      )}
      <FormularioAuth modo="login" destino={rutaInterna(destino) ?? undefined} />
    </div>
  );
}
