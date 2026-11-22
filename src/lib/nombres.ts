// Nombre de los empleados en partes: primer nombre y los dos apellidos son obligatorios.
// En la tabla, `nombre` (primer nombre + primer apellido) y `nombre_completo` son generados.

export type Nombres = {
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string;
};

// Lee las cuatro partes de un formulario. Las reglas son las mismas de los checks y el
// trigger de la tabla empleados: sin espacios sobrantes y hasta 40 caracteres cada una.
export function leerNombres(form: FormData): Nombres | { error: string } {
  const leer = (campo: string) => String(form.get(campo) ?? "").trim().replace(/\s+/g, " ");
  const primer_nombre = leer("primer_nombre");
  const segundo_nombre = leer("segundo_nombre");
  const primer_apellido = leer("primer_apellido");
  const segundo_apellido = leer("segundo_apellido");
  if (!primer_nombre) return { error: "Escribe tu primer nombre" };
  if (!primer_apellido) return { error: "Escribe tu primer apellido" };
  if (!segundo_apellido) return { error: "Escribe tu segundo apellido" };
  if ([primer_nombre, segundo_nombre, primer_apellido, segundo_apellido].some((p) => p.length > 40)) {
    return { error: "Cada nombre y apellido puede tener hasta 40 caracteres" };
  }
  return { primer_nombre, segundo_nombre: segundo_nombre || null, primer_apellido, segundo_apellido };
}

// Los empleados registrados antes de pedir los apellidos pueden no tenerlos
export const faltanApellidos = (e: { primer_apellido: string | null; segundo_apellido: string | null }) =>
  !e.primer_apellido || !e.segundo_apellido;
