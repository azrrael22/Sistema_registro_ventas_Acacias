import type { AuthError } from "@supabase/supabase-js";

// Mensajes de error para el usuario. Dos clases:
// - Del usuario o de una regla de negocio: se dice qué corregir.
// - Del sistema (sin conexión, Supabase caído, un fallo): se dice que no es culpa suya, si se
//   guardó o no y qué hacer. Lo inesperado se registra con console.error (logs de Vercel).

const INESPERADO = "Ocurrió un error inesperado y no se guardó nada. Inténtalo de nuevo; si sigue pasando, avísale a un administrador.";
const SIN_BASE_DE_DATOS = "No se pudo conectar con la base de datos, así que no se guardó nada. Inténtalo de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Sal y vuelve a ingresar.";
const SIN_INTERNET = "Estás sin conexión a internet, así que no se envió nada. Conéctate e inténtalo de nuevo.";

// Errores de Postgres que trae PostgREST: el código SQLSTATE y el texto en inglés de Postgres,
// salvo los `raise exception` de las migraciones, que ya están escritos para el empleado.
const DE_POSTGRES: Record<string, string> = {
  "23505": "Ya existe un registro con ese nombre",
  "23503": "Lo que elegiste ya no existe. Recarga la página e inténtalo de nuevo.",
  "23514": "Algún dato no es válido. Revisa el formulario e inténtalo de nuevo.",
  "23502": "Falta un dato obligatorio. Revisa el formulario e inténtalo de nuevo.",
  "22P02": "Algún dato no tiene el formato correcto. Revisa el formulario e inténtalo de nuevo.",
  "22003": "El número es demasiado grande",
  "57014": "La base de datos tardó demasiado en responder y no se guardó nada. Inténtalo de nuevo.",
  "40001": "Alguien más estaba guardando al mismo tiempo y no se guardó nada. Inténtalo de nuevo.",
  "40P01": "Alguien más estaba guardando al mismo tiempo y no se guardó nada. Inténtalo de nuevo.",
};

type ErrorBD = { message: string; code?: string };

// Mensaje legible a partir de un error de Supabase/Postgres
export function mensajeError(error: ErrorBD): string;
export function mensajeError(error: ErrorBD | null): string | null;
export function mensajeError(error: ErrorBD | null) {
  if (!error) return null;
  const { code, message } = error;
  // raise exception de las migraciones: el texto ya es para el empleado
  if (code === "P0001") return message;
  if (code === "42501") {
    // Los raise con errcode insufficient_privilege traen su propio texto; los de Postgres
    // (grants y RLS) vienen en inglés
    return /^(permission denied|new row violates row-level security)/.test(message) ? "No tienes permiso para hacer esto" : message;
  }
  if (code && code in DE_POSTGRES) return DE_POSTGRES[code];
  // JWT vencido o inválido
  if (code?.startsWith("PGRST3")) return SESION_VENCIDA;
  // Sin código: no hubo respuesta de Postgres (fetch failed, PostgREST caído, timeout).
  // PGRST000-003: PostgREST no pudo conectarse a Postgres.
  if (!code || /^PGRST00[0-3]$/.test(code)) {
    console.error("Sin conexión con la base de datos:", error);
    return SIN_BASE_DE_DATOS;
  }
  console.error("Error de la base de datos sin mensaje propio:", error);
  return INESPERADO;
}

const DE_AUTH: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos",
  email_not_confirmed: "Primero confirma tu correo con el enlace que te enviamos",
  user_already_exists: "Ese correo ya está registrado",
  email_exists: "Ese correo ya está registrado",
  email_address_invalid: "Ese correo no es válido",
  weak_password: "Esa contraseña es muy débil; prueba con una más larga",
  same_password: "La nueva contraseña debe ser distinta a la actual",
  over_email_send_rate_limit: "Ya se enviaron varios correos seguidos. Espera unos minutos antes de volver a intentarlo.",
  over_request_rate_limit: "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.",
  session_not_found: SESION_VENCIDA,
  session_expired: SESION_VENCIDA,
  refresh_token_not_found: SESION_VENCIDA,
  refresh_token_already_used: SESION_VENCIDA,
  bad_jwt: SESION_VENCIDA,
};

// Mensaje legible a partir de un error de Supabase Auth
export function mensajeErrorAuth(error: AuthError) {
  if (error.code && error.code in DE_AUTH) return DE_AUTH[error.code];
  // Versiones de Auth sin código para la contraseña equivocada
  if (error.message === "Invalid login credentials") return DE_AUTH.invalid_credentials;
  // Status 0: no hubo respuesta (AuthRetryableFetchError); 5xx o timeout: Auth falló
  if (!error.status || error.status >= 500 || error.code === "request_timeout") {
    console.error("Sin conexión con Supabase Auth:", error);
    return "El servidor no respondió, así que no se hizo ningún cambio. Inténtalo de nuevo en un momento.";
  }
  console.error("Error de Supabase Auth sin mensaje propio:", error);
  return "Ocurrió un error inesperado y no se hizo ningún cambio. Inténtalo de nuevo; si sigue pasando, avísale a un administrador.";
}

const sinInternet = () => typeof navigator !== "undefined" && navigator.onLine === false;
// El navegador tiene una versión vieja de la app (hubo un despliegue): el servidor no encontró
// la acción, así que no se ejecutó
const esVersionVieja = (e: unknown) => e instanceof Error && e.name === "UnrecognizedActionError";

// Código con que el error del servidor aparece en los logs (en producción el mensaje real no
// llega al navegador)
export function codigoError(e: unknown) {
  return e instanceof Error && "digest" in e && e.digest ? String(e.digest) : null;
}

// Mensaje para una acción del servidor que lanzó una excepción en vez de devolver su error:
// sin internet, se cortó la conexión, la app se actualizó o el servidor falló.
export function mensajeFallo(e: unknown) {
  if (sinInternet()) return SIN_INTERNET;
  if (esVersionVieja(e)) return "La aplicación se actualizó mientras la usabas. Recarga la página e inténtalo de nuevo.";
  // fetch rechazado: la petición pudo llegar o no al servidor
  if (e instanceof TypeError) return "Se perdió la conexión con el servidor y no se sabe si se guardó. Recarga la página para revisarlo antes de repetirlo.";
  // Vercel rechaza peticiones de más de 4,5 MB
  if (e instanceof Error && /too large|exceeded/i.test(e.message)) return "Lo que enviaste pesa demasiado (por ejemplo, una foto muy grande). Usa un archivo más liviano.";
  const codigo = codigoError(e);
  return `El sistema tuvo un error y no terminó lo que pediste. Inténtalo de nuevo; si sigue pasando, avísale a un administrador${codigo ? ` (código del error: ${codigo})` : ""}.`;
}

// Lo mismo para la venta: lo que importa es saber si quedó registrada
export function mensajeFalloVenta(e: unknown) {
  if (sinInternet()) return "Estás sin conexión a internet: la venta no se envió. El carrito sigue aquí; regístrala cuando vuelva la conexión.";
  if (esVersionVieja(e)) return "La aplicación se actualizó mientras la usabas y la venta no se registró. Recarga la página y vuelve a registrarla.";
  const codigo = codigoError(e);
  return `No se pudo confirmar si la venta quedó registrada. Revísalo en Ventas antes de registrarla otra vez${codigo ? ` (código del error: ${codigo})` : ""}.`;
}
