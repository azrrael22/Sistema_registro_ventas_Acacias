// Ruta de esta misma app a la que se vuelve después de ingresar (`?destino=` del login). Devuelve
// null si el valor apunta a otro sitio («//otro.com», «/\otro.com», «https://…»): así el login no
// sirve para mandar a alguien a una página ajena.
export function rutaInterna(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.startsWith("/")) return null;
  const base = "http://acacias.invalid";
  let url: URL;
  try {
    url = new URL(valor, base);
  } catch {
    return null;
  }
  return url.origin === base ? url.pathname + url.search : null;
}
