import type { Metadata } from "next";
import { FormularioAuth } from "../formulario-auth";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return <FormularioAuth modo="login" />;
}
