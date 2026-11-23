import { unstable_rethrow } from "next/navigation";
import { mensajeFallo } from "@/lib/errores";

// Resultado que devuelven las server actions a los formularios.
export type Resultado = { error?: string; ok?: string } | undefined;
export type Accion = (previo: Resultado, form: FormData) => Promise<Resultado>;

// Envuelve una acción para useActionState: si lanza una excepción (sin internet, se cortó la
// conexión, la app se actualizó, el servidor falló) el formulario muestra qué pasó, en vez de que
// error.tsx reemplace la pantalla y se pierda lo escrito. unstable_rethrow deja pasar las
// redirecciones: cuando la acción llama a redirect(), Next rechaza su promesa con un error propio.
export function atraparFallos<E extends { error?: string; ok?: string } | undefined>(accion: (previo: E, form: FormData) => Promise<E>) {
  return async (previo: E, form: FormData): Promise<E> => {
    try {
      return await accion(previo, form);
    } catch (e) {
      unstable_rethrow(e);
      return { ...previo, ok: undefined, error: mensajeFallo(e) } as E;
    }
  };
}
