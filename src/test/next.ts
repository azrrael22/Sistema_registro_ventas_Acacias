// Dobles de next/navigation, next/headers y de la sesión para probar acciones y rutas:
//   vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);
//   vi.mock("next/headers", async () => (await import("@/test/next")).moduloHeaders);
//   vi.mock("@/server/sesion", async () => (await import("@/test/next")).moduloSesion);
import type { Database } from "@/lib/database.types";

// redirect() termina la acción lanzando un error que Next atrapa; aquí la prueba lo espera
export class Redireccion extends Error {
  constructor(readonly url: string) {
    super(`redirect(${url})`);
  }
}
export const moduloNavegacion = {
  redirect: (url: string) => {
    throw new Redireccion(url);
  },
};

// Cookies del request en memoria, y los headers que leen las acciones (origin)
export const galletas = new Map<string, { value: string; opciones?: unknown }>();
export const moduloHeaders = {
  headers: async () => new Headers({ origin: "https://acacias.test" }),
  cookies: async () => ({
    get: (nombre: string) => {
      const galleta = galletas.get(nombre);
      return galleta && { name: nombre, value: galleta.value };
    },
    set: (nombre: string, value: string, opciones?: unknown) => galletas.set(nombre, { value, opciones }),
    delete: (nombre: string) => galletas.delete(nombre),
  }),
};

// Empleado de la sesión: activo y sin ser admin
export const empleado: Database["public"]["Tables"]["empleados"]["Row"] = {
  id: "empleado-1",
  email: "ana@acacias.test",
  activo: true,
  es_admin: false,
  creado_en: "2026-11-01T15:00:00Z",
  primer_nombre: "Ana",
  segundo_nombre: null,
  primer_apellido: "Rojas",
  segundo_apellido: "Díaz",
  nombre: "Ana Rojas",
  nombre_completo: "Ana Rojas Díaz",
  tipo_documento: "CC",
  numero_documento: "1032456789",
};
export const moduloSesion = {
  requerirEmpleadoActivo: async () => empleado,
  requerirAdmin: async () => ({ ...empleado, es_admin: true }),
};
