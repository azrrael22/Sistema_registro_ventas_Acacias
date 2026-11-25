import { AuthError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { codigoError, mensajeError, mensajeErrorAuth, mensajeFallo, mensajeFalloVenta } from "@/lib/errores";

const INESPERADO = "Ocurrió un error inesperado y no se guardó nada. Inténtalo de nuevo; si sigue pasando, avísale a un administrador.";
const SIN_BASE_DE_DATOS = "No se pudo conectar con la base de datos, así que no se guardó nada. Inténtalo de nuevo en un momento.";
const SESION_VENCIDA = "Tu sesión venció. Sal y vuelve a ingresar.";

// Los errores del sistema se registran con console.error (logs de Vercel); en las pruebas no se imprimen
let consola: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consola = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("mensajeError", () => {
  test("sin error no hay mensaje", () => {
    expect(mensajeError(null)).toBeNull();
  });

  test("un raise exception de las migraciones llega tal cual", () => {
    expect(mensajeError({ code: "P0001", message: "No hay suficiente stock de Gaseosa" })).toBe("No hay suficiente stock de Gaseosa");
  });

  test.each(["permission denied for table ventas", "new row violates row-level security policy for table retiros"])(
    "un permiso negado por Postgres (%s) se dice en español",
    (message) => {
      expect(mensajeError({ code: "42501", message })).toBe("No tienes permiso para hacer esto");
    },
  );

  test("un 42501 con texto propio de las migraciones llega tal cual", () => {
    expect(mensajeError({ code: "42501", message: "Solo los socios pueden retirar dinero" })).toBe("Solo los socios pueden retirar dinero");
  });

  test.each([
    ["23505", "Ya existe un registro con ese nombre"],
    ["23503", "Lo que elegiste ya no existe. Recarga la página e inténtalo de nuevo."],
    ["22003", "El número es demasiado grande"],
    ["40P01", "Alguien más estaba guardando al mismo tiempo y no se guardó nada. Inténtalo de nuevo."],
  ])("el código de Postgres %s se traduce", (code, texto) => {
    expect(mensajeError({ code, message: "duplicate key value violates unique constraint" })).toBe(texto);
    expect(consola).not.toHaveBeenCalled();
  });

  test("un JWT vencido pide volver a ingresar", () => {
    expect(mensajeError({ code: "PGRST301", message: "JWT expired" })).toBe(SESION_VENCIDA);
  });

  test.each([undefined, "", "PGRST000", "PGRST003"])("sin respuesta de Postgres (código %s) dice que no hubo conexión y lo registra", (code) => {
    expect(mensajeError({ code, message: "fetch failed" })).toBe(SIN_BASE_DE_DATOS);
    expect(consola).toHaveBeenCalledWith("Sin conexión con la base de datos:", { code, message: "fetch failed" });
  });

  test.each(["PGRST004", "PGRST100", "XX000"])("un código sin traducción (%s) es un error inesperado y se registra", (code) => {
    expect(mensajeError({ code, message: "algo" })).toBe(INESPERADO);
    expect(consola).toHaveBeenCalledWith("Error de la base de datos sin mensaje propio:", { code, message: "algo" });
  });
});

describe("mensajeErrorAuth", () => {
  test("la contraseña equivocada", () => {
    expect(mensajeErrorAuth(new AuthError("Invalid login credentials", 400, "invalid_credentials"))).toBe("Correo o contraseña incorrectos");
  });

  test("versiones de Auth sin código para la contraseña equivocada", () => {
    expect(mensajeErrorAuth(new AuthError("Invalid login credentials", 400))).toBe("Correo o contraseña incorrectos");
  });

  test("una sesión vencida pide volver a ingresar", () => {
    expect(mensajeErrorAuth(new AuthError("Session expired", 403, "session_expired"))).toBe(SESION_VENCIDA);
  });

  test.each([
    ["sin respuesta", new AuthError("fetch failed", 0)],
    ["sin status", new AuthError("fetch failed")],
    ["Auth caído", new AuthError("Service unavailable", 503)],
    ["Auth falló", new AuthError("Internal server error", 500)],
    ["timeout", new AuthError("Timeout", 400, "request_timeout")],
  ])("%s: el servidor no respondió y se registra", (_, error) => {
    expect(mensajeErrorAuth(error)).toBe("El servidor no respondió, así que no se hizo ningún cambio. Inténtalo de nuevo en un momento.");
    expect(consola).toHaveBeenCalledWith("Sin conexión con Supabase Auth:", error);
  });

  test("un error de Auth sin traducción es inesperado y se registra", () => {
    const error = new AuthError("Algo raro", 422, "unexpected_failure");
    expect(mensajeErrorAuth(error)).toBe(
      "Ocurrió un error inesperado y no se hizo ningún cambio. Inténtalo de nuevo; si sigue pasando, avísale a un administrador.",
    );
    expect(consola).toHaveBeenCalledWith("Error de Supabase Auth sin mensaje propio:", error);
  });

  test("un status 499 no es un fallo del servidor", () => {
    expect(mensajeErrorAuth(new AuthError("Algo raro", 499))).toMatch(/^Ocurrió un error inesperado/);
  });
});

// Error del servidor como llega al navegador en producción: sin mensaje real, con el código de los logs
const conDigest = (digest: unknown) => Object.assign(new Error("An error occurred in the Server Components render."), { digest });

describe("codigoError", () => {
  test("el digest del error del servidor", () => {
    expect(codigoError(conDigest("3418977"))).toBe("3418977");
    expect(codigoError(conDigest(42))).toBe("42");
  });

  test.each([
    ["un error sin digest", new Error("x")],
    ["un digest vacío", conDigest("")],
    ["algo que no es un Error", { digest: "3418977" }],
  ])("%s no tiene código", (_, e) => {
    expect(codigoError(e)).toBeNull();
  });
});

const sinInternet = () => vi.stubGlobal("navigator", { onLine: false });
const versionVieja = () => Object.assign(new Error("Server action not found"), { name: "UnrecognizedActionError" });

describe("mensajeFallo", () => {
  test("sin internet no se envió nada", () => {
    sinInternet();
    expect(mensajeFallo(new TypeError("Failed to fetch"))).toBe(
      "Estás sin conexión a internet, así que no se envió nada. Conéctate e inténtalo de nuevo.",
    );
  });

  test("con internet, un fetch rechazado no dice que no hay internet", () => {
    vi.stubGlobal("navigator", { onLine: true });
    expect(mensajeFallo(new TypeError("Failed to fetch"))).toMatch(/^Se perdió la conexión/);
  });

  test("la app se actualizó mientras se usaba", () => {
    expect(mensajeFallo(versionVieja())).toBe("La aplicación se actualizó mientras la usabas. Recarga la página e inténtalo de nuevo.");
  });

  test("se cortó la conexión: no se sabe si se guardó", () => {
    expect(mensajeFallo(new TypeError("Failed to fetch"))).toBe(
      "Se perdió la conexión con el servidor y no se sabe si se guardó. Recarga la página para revisarlo antes de repetirlo.",
    );
  });

  test.each(["Request Entity Too Large", "Body exceeded 4.5mb limit"])("lo enviado pesa demasiado (%s)", (mensaje) => {
    expect(mensajeFallo(new Error(mensaje))).toBe(
      "Lo que enviaste pesa demasiado (por ejemplo, una foto muy grande). Usa un archivo más liviano.",
    );
  });

  test("un fallo del servidor lleva el código del error", () => {
    expect(mensajeFallo(conDigest("3418977"))).toBe(
      "El sistema tuvo un error y no terminó lo que pediste. Inténtalo de nuevo; si sigue pasando, avísale a un administrador (código del error: 3418977).",
    );
  });

  test.each([["un Error sin código", new Error("boom")], ["algo que no es un Error", "boom"]])("%s no muestra código", (_, e) => {
    expect(mensajeFallo(e)).toBe(
      "El sistema tuvo un error y no terminó lo que pediste. Inténtalo de nuevo; si sigue pasando, avísale a un administrador.",
    );
  });
});

describe("mensajeFalloVenta", () => {
  test("sin internet la venta no se envió y el carrito sigue", () => {
    sinInternet();
    expect(mensajeFalloVenta(new TypeError("Failed to fetch"))).toBe(
      "Estás sin conexión a internet: la venta no se envió. El carrito sigue aquí; regístrala cuando vuelva la conexión.",
    );
  });

  test("la app se actualizó y la venta no se registró", () => {
    expect(mensajeFalloVenta(versionVieja())).toBe(
      "La aplicación se actualizó mientras la usabas y la venta no se registró. Recarga la página y vuelve a registrarla.",
    );
  });

  test("cualquier otro fallo: revisar en Ventas antes de repetirla, con el código si lo hay", () => {
    expect(mensajeFalloVenta(conDigest("77"))).toBe(
      "No se pudo confirmar si la venta quedó registrada. Revísalo en Ventas antes de registrarla otra vez (código del error: 77).",
    );
    expect(mensajeFalloVenta(new TypeError("Failed to fetch"))).toBe(
      "No se pudo confirmar si la venta quedó registrada. Revísalo en Ventas antes de registrarla otra vez.",
    );
  });
});
