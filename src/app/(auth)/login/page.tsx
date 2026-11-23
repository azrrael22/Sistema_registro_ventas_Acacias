import type { Metadata } from "next";
import { Aviso } from "@/components/ui";
import { FormularioAuth } from "../formulario-auth";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // auth/callback manda aquí cuando el enlace para confirmar la cuenta venció o ya se usó
  const { error } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      {error === "enlace" && (
        <Aviso>El enlace del correo venció o ya se usó. Si ya confirmaste tu cuenta, ingresa con tu correo y contraseña.</Aviso>
      )}
      <FormularioAuth modo="login" />
    </div>
  );
}
