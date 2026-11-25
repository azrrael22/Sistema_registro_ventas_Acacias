// Lectura de campos de formulario. Los lectores de cada dominio (leerNombres, leerRetiro…) los
// usan y devuelven los datos ya validados o { error } con el texto para el empleado.

// Valor de un campo de texto tal cual (las contraseñas no se recortan); "" si no vino
export const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "");

// Campo opcional (una nota): recortado, o null si quedó vacío
export const textoOpcional = (form: FormData, campo: string) => texto(form, campo).trim() || null;

// Campo numérico: NaN si vino vacío. Number("") es 0, y un conteo o un precio vacío no es un 0.
export function numero(form: FormData, campo: string) {
  const valor = texto(form, campo).trim();
  return valor ? Number(valor) : NaN;
}
