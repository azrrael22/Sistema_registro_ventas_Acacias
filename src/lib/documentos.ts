// Documento de identidad de los empleados: tipo + número, único entre todos.
import type { Database } from "@/lib/database.types";

export type TipoDocumento = Database["public"]["Enums"]["tipo_documento"];

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; texto: string }[] = [
  { valor: "TI", texto: "Tarjeta de identidad" },
  { valor: "CC", texto: "Cédula de ciudadanía" },
  { valor: "Pasaporte", texto: "Pasaporte" },
];

// Lee tipo_documento y numero_documento de un formulario. El número se guarda sin
// puntos, espacios ni guiones; las reglas son las mismas del check de la tabla empleados.
export function leerDocumento(form: FormData): { tipo: TipoDocumento; numero: string } | { error: string } {
  const tipo = TIPOS_DOCUMENTO.find((t) => t.valor === form.get("tipo_documento"))?.valor;
  if (!tipo) return { error: "Elige el tipo de documento" };
  const numero = String(form.get("numero_documento") ?? "").replace(/[\s.-]/g, "").toUpperCase();
  if (tipo === "Pasaporte") {
    if (!/^[A-Z0-9]{5,20}$/.test(numero)) return { error: "El pasaporte debe tener entre 5 y 20 letras o números" };
  } else if (!/^[0-9]{5,12}$/.test(numero)) {
    return { error: "El número de documento debe tener entre 5 y 12 dígitos" };
  }
  return { tipo, numero };
}

// «CC 1.032.456.789», «Pasaporte AB123456»
export const documento = (tipo: TipoDocumento, numero: string) =>
  `${tipo} ${tipo === "Pasaporte" ? numero : numero.replace(/\B(?=(\d{3})+$)/g, ".")}`;
