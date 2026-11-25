// Retiros de dinero de una categoría. La base de datos impide retirar más que el saldo.
import { dinero } from "@/lib/formato";
import { texto, textoOpcional } from "@/lib/formulario";

// Monto de un retiro: pesos enteros mayores que 0 (COP sin decimales); null si no lo es.
// La misma regla en el campo (mientras se escribe) y en la acción del servidor.
export function montoRetiro(valor: string) {
  const monto = Number(valor);
  return Number.isInteger(monto) && monto > 0 ? monto : null;
}

export type Retiro = { categoria_id: number; monto: number; nota: string | null };

export function leerRetiro(form: FormData): Retiro | { error: string } {
  const monto = montoRetiro(texto(form, "monto"));
  if (monto === null) return { error: "El monto debe ser un número entero mayor que 0" };
  return { categoria_id: Number(form.get("categoria_id")), monto, nota: textoOpcional(form, "nota") };
}

// Saldo de la categoría elegida (0 si no hay ninguna)
export const saldoDe = (categorias: { id: number; saldo: number }[], id: number | undefined) =>
  categorias.find((c) => c.id === id)?.saldo ?? 0;

// Lo que dice el campo mientras se escribe el monto: la pista bajo el campo, si supera el saldo y
// el texto del botón, que dice cuánto se retira para que un cero de más no pase sin verse
export function estadoMonto(valor: string, saldo: number) {
  const monto = montoRetiro(valor);
  const excede = monto !== null && monto > saldo;
  const valido = monto !== null && !excede;
  return {
    excede,
    pista: pistaMonto(monto, excede, saldo),
    boton: valido ? `Retirar ${dinero(monto)}` : "Registrar retiro",
  };
}

function pistaMonto(monto: number | null, excede: boolean, saldo: number) {
  if (monto === null) return `Disponible: ${dinero(saldo)}`;
  return excede ? `Supera lo disponible en esta categoría (${dinero(saldo)})` : `${dinero(monto)} de ${dinero(saldo)} disponibles`;
}
