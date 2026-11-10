import type { Metadata } from "next";
import { FormularioAuth } from "../formulario-auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return <FormularioAuth modo="registro" />;
}
