// Cliente de Supabase falso para probar acciones, rutas y consultas por su borde. Cada consulta
// responde lo programado para su clave y queda registrada para revisar qué se pidió.
//
// Claves: "from:<tabla>", "rpc:<función>", "auth.<método>" y "storage:<bucket>.<método>".
// Uso en una prueba:
//   vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
//   const supabase = usarSupabase({ "from:retiros": { error: { code: "P0001", message: "…" } } });
//   …
//   expect(supabase.pedidos("from:retiros")).toEqual([[["from", "retiros"], ["insert", { … }]]]);

export type ErrorFalso = { message: string; code?: string; status?: number; name?: string };
export type Respuesta = { data?: unknown; error?: ErrorFalso | null };
type Llamada = [metodo: string, ...args: unknown[]];

export function supabaseFalso(programadas: Record<string, Respuesta | Respuesta[]> = {}) {
  const pedidos: { clave: string; llamadas: Llamada[] }[] = [];
  const colas = new Map(Object.entries(programadas).map(([clave, r]) => [clave, Array.isArray(r) ? [...r] : [r]]));

  // Respuesta de la siguiente consulta a `clave`; la última se repite. Sin programar: sin datos ni error.
  const responder = (clave: string) => {
    const cola = colas.get(clave) ?? [];
    const r = cola.length > 1 ? cola.shift() : cola[0];
    return { data: null, error: null, ...r };
  };

  const registrar = (clave: string, llamada: Llamada) => {
    const llamadas = [llamada];
    pedidos.push({ clave, llamadas });
    return llamadas;
  };

  // Consulta encadenable (from, rpc): cada método se registra y devuelve la misma consulta; al
  // esperarla responde lo programado. Con .throwOnError() un error se lanza, como en supabase-js.
  const consulta = (clave: string, llamada: Llamada) => {
    const llamadas = registrar(clave, llamada);
    let lanzar = false;
    const cadena: object = new Proxy(
      {},
      {
        get(_, metodo) {
          if (metodo === "then") {
            const r = responder(clave);
            const promesa = lanzar && r.error ? Promise.reject(r.error) : Promise.resolve(r);
            return promesa.then.bind(promesa);
          }
          return (...args: unknown[]) => {
            if (metodo === "throwOnError") lanzar = true;
            llamadas.push([String(metodo), ...args]);
            return cadena;
          };
        },
      },
    );
    return cadena;
  };

  // Métodos async sueltos (auth, storage)
  const metodos = (prefijo: string) =>
    new Proxy(
      {},
      {
        get: (_, metodo) => async (...args: unknown[]) => {
          const clave = `${prefijo}.${String(metodo)}`;
          registrar(clave, [String(metodo), ...args]);
          return responder(clave);
        },
      },
    );

  return {
    from: (tabla: string) => consulta(`from:${tabla}`, ["from", tabla]),
    rpc: (nombre: string, args?: unknown) => consulta(`rpc:${nombre}`, ["rpc", nombre, args]),
    auth: metodos("auth"),
    storage: { from: (bucket: string) => metodos(`storage:${bucket}`) },
    // Lo que se pidió a `clave`, en orden: cada pedido es su cadena de llamadas
    pedidos: (clave: string) => pedidos.filter((p) => p.clave === clave).map((p) => p.llamadas),
    // Todas las claves, en el orden en que se pidieron
    orden: () => pedidos.map((p) => p.clave),
  };
}

export type SupabaseFalso = ReturnType<typeof supabaseFalso>;

// El cliente que devuelve createClient() en la prueba actual
let actual = supabaseFalso();
export const usarSupabase = (programadas: Record<string, Respuesta | Respuesta[]> = {}) => (actual = supabaseFalso(programadas));
export const moduloSupabase = { createClient: async () => actual };
// Para los clientes que se crean sin await (createServerClient del proxy, el del latido)
export const supabaseActual = () => actual;
