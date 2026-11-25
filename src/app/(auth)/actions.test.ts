import { beforeEach, describe, expect, test, vi } from "vitest";
import { formulario } from "@/test/formularios";
import { galletas, Redireccion } from "@/test/next";
import { usarSupabase } from "@/test/supabase-falso";
import { cerrarSesion, iniciarSesion, registrarse, restablecerContrasena, solicitarRecuperacion } from "./actions";

vi.mock("@/server/supabase", async () => (await import("@/test/supabase-falso")).moduloSupabase);
vi.mock("next/navigation", async () => (await import("@/test/next")).moduloNavegacion);
vi.mock("next/headers", async () => (await import("@/test/next")).moduloHeaders);

beforeEach(() => {
  galletas.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const errorAuth = (code: string, status = 400, message = "x") => ({ error: { message, code, status } });

describe("iniciarSesion", () => {
  test("entra a la app", async () => {
    const supabase = usarSupabase();
    await expect(iniciarSesion(undefined, formulario({ email: " ana@acacias.test ", password: " clave " }))).rejects.toEqual(new Redireccion("/"));
    expect(supabase.pedidos("auth.signInWithPassword")).toEqual([[["signInWithPassword", { email: "ana@acacias.test", password: " clave " }]]]);
  });

  test("vuelve a la pantalla que se abrió sin sesión, con una navegación completa", async () => {
    usarSupabase();
    expect(await iniciarSesion(undefined, formulario({ email: "ana@acacias.test", password: "clave", destino: "/notificaciones/12" }))).toEqual({
      ir: "/notificaciones/12",
    });
  });

  test("un destino de otro sitio se ignora", async () => {
    usarSupabase();
    await expect(
      iniciarSesion(undefined, formulario({ email: "ana@acacias.test", password: "clave", destino: "//otro.com" })),
    ).rejects.toEqual(new Redireccion("/"));
  });

  test("con la contraseña equivocada, conserva el correo escrito", async () => {
    usarSupabase({ "auth.signInWithPassword": errorAuth("invalid_credentials") });
    expect(await iniciarSesion(undefined, formulario({ email: "ana@acacias.test", password: "mala" }))).toEqual({
      error: "Correo o contraseña incorrectos",
      valores: { email: "ana@acacias.test" },
    });
  });
});

describe("registrarse", () => {
  const datos = {
    primer_nombre: "Ana",
    segundo_nombre: "",
    primer_apellido: "Rojas",
    segundo_apellido: "Díaz",
    tipo_documento: "CC",
    numero_documento: "1.032.456",
    email: " ana@acacias.test ",
    password: "clave-segura",
    confirmar: "clave-segura",
  };
  const valores = {
    primer_nombre: "Ana",
    segundo_nombre: "",
    primer_apellido: "Rojas",
    segundo_apellido: "Díaz",
    tipo_documento: "CC",
    numero_documento: "1.032.456",
    email: " ana@acacias.test ",
  };

  test("crea la cuenta y pide confirmar el correo", async () => {
    const supabase = usarSupabase({ "auth.signUp": { data: { session: null } } });
    expect(await registrarse(undefined, formulario(datos))).toEqual({
      ok: "Te enviamos un correo para confirmar tu cuenta. Después un administrador debe aprobarla.",
    });
    expect(supabase.pedidos("auth.signUp")).toEqual([
      [
        [
          "signUp",
          {
            email: "ana@acacias.test",
            password: "clave-segura",
            options: {
              data: {
                primer_nombre: "Ana",
                segundo_nombre: null,
                primer_apellido: "Rojas",
                segundo_apellido: "Díaz",
                tipo_documento: "CC",
                numero_documento: "1032456",
              },
              emailRedirectTo: "https://acacias.test/auth/callback",
            },
          },
        ],
      ],
    ]);
  });

  test("si no hace falta confirmar el correo, espera la aprobación", async () => {
    usarSupabase({ "auth.signUp": { data: { session: { access_token: "t" } } } });
    await expect(registrarse(undefined, formulario(datos))).rejects.toEqual(new Redireccion("/pendiente"));
  });

  test.each([
    ["un nombre incompleto", { primer_apellido: "" }, "Escribe tu primer apellido"],
    ["un documento inválido", { numero_documento: "12" }, "El número de documento debe tener entre 5 y 12 dígitos"],
    ["una contraseña corta", { password: "corta", confirmar: "corta" }, "La contraseña debe tener al menos 8 caracteres"],
  ])("%s no llega a Auth y conserva lo escrito, sin la contraseña", async (_, cambio, error) => {
    const supabase = usarSupabase();
    expect(await registrarse(undefined, formulario({ ...datos, ...cambio }))).toEqual({ error, valores: { ...valores, ...cambio, password: undefined, confirmar: undefined } });
    expect(supabase.orden()).toEqual([]);
  });

  test.each([
    ["un correo ya registrado", errorAuth("user_already_exists"), "Ese correo ya está registrado"],
    ["un documento repetido (código de Postgres)", errorAuth("23505", 500), "Ese documento ya está registrado"],
    ["un documento repetido (mensaje genérico)", errorAuth("unexpected_failure", 500, "Database error saving new user"), "Ese documento ya está registrado"],
    ["un correo inválido", errorAuth("email_address_invalid"), "Ese correo no es válido"],
  ])("%s", async (_, respuesta, error) => {
    usarSupabase({ "auth.signUp": respuesta });
    expect(await registrarse(undefined, formulario(datos))).toEqual({ error, valores });
  });
});

describe("solicitarRecuperacion", () => {
  test("envía el enlace sin decir si la cuenta existe", async () => {
    const supabase = usarSupabase();
    expect(await solicitarRecuperacion(undefined, formulario({ email: " ana@acacias.test " }))).toEqual({
      ok: "Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también el correo no deseado.",
    });
    expect(supabase.pedidos("auth.resetPasswordForEmail")).toEqual([
      [["resetPasswordForEmail", "ana@acacias.test", { redirectTo: "https://acacias.test/auth/callback?next=/restablecer" }]],
    ]);
  });

  test.each([["vacío", { email: "  " }], ["ausente", {}]])("un correo %s no se envía", async (_, campos) => {
    const supabase = usarSupabase();
    expect(await solicitarRecuperacion(undefined, formulario(campos))).toEqual({ error: "Escribe tu correo" });
    expect(supabase.orden()).toEqual([]);
  });

  test("demasiados correos seguidos", async () => {
    usarSupabase({ "auth.resetPasswordForEmail": errorAuth("over_email_send_rate_limit", 429) });
    expect(await solicitarRecuperacion(undefined, formulario({ email: "ana@acacias.test" }))).toEqual({
      error: "Ya se enviaron varios correos seguidos. Espera unos minutos antes de volver a intentarlo.",
    });
  });
});

describe("restablecerContrasena", () => {
  const sesion = { "auth.getClaims": { data: { claims: { sub: "empleado-1" } } } };
  const claves = { password: "nueva-clave", confirmar: "nueva-clave" };

  test("con el enlace del correo, cambia la contraseña y entra", async () => {
    galletas.set("recuperacion", { value: "empleado-1" });
    const supabase = usarSupabase(sesion);
    await expect(restablecerContrasena(undefined, formulario(claves))).rejects.toEqual(new Redireccion("/"));
    expect(supabase.pedidos("auth.updateUser")).toEqual([[["updateUser", { password: "nueva-clave" }]]]);
    expect(galletas.has("recuperacion")).toBe(false);
  });

  test.each([
    ["sin la cookie del enlace", null],
    ["con la cookie de otro usuario", "empleado-2"],
  ])("%s no la cambia", async (_, cookie) => {
    if (cookie) galletas.set("recuperacion", { value: cookie });
    const supabase = usarSupabase(sesion);
    expect(await restablecerContrasena(undefined, formulario(claves))).toEqual({
      error: "El enlace ya no es válido. Pide uno nuevo desde «¿Olvidaste tu contraseña?»",
    });
    expect(supabase.pedidos("auth.updateUser")).toEqual([]);
  });

  test.each([
    ["sin sesión", null],
    ["con una sesión sin datos", { claims: null }],
  ])("%s no la cambia", async (_, data) => {
    galletas.set("recuperacion", { value: "empleado-1" });
    usarSupabase({ "auth.getClaims": { data } });
    expect(await restablecerContrasena(undefined, formulario(claves))).toEqual({
      error: "El enlace ya no es válido. Pide uno nuevo desde «¿Olvidaste tu contraseña?»",
    });
  });

  test("una contraseña nueva inválida", async () => {
    galletas.set("recuperacion", { value: "empleado-1" });
    usarSupabase(sesion);
    expect(await restablecerContrasena(undefined, formulario({ password: "corta", confirmar: "corta" }))).toEqual({
      error: "La contraseña debe tener al menos 8 caracteres",
    });
  });

  test("si Auth no la guardó, la cookie sigue para reintentar", async () => {
    galletas.set("recuperacion", { value: "empleado-1" });
    usarSupabase({ ...sesion, "auth.updateUser": errorAuth("weak_password", 422) });
    expect(await restablecerContrasena(undefined, formulario(claves))).toEqual({ error: "Esa contraseña es muy débil; prueba con una más larga" });
    expect(galletas.has("recuperacion")).toBe(true);
  });
});

describe("cerrarSesion", () => {
  test("cierra la sesión y lleva al login", async () => {
    const supabase = usarSupabase();
    await expect(cerrarSesion()).rejects.toEqual(new Redireccion("/login"));
    expect(supabase.pedidos("auth.signOut")).toEqual([[["signOut"]]]);
  });

  test("si Auth no responde, al menos cierra la de este dispositivo", async () => {
    const supabase = usarSupabase({ "auth.signOut": [errorAuth("unexpected_failure", 503), { error: null }] });
    await expect(cerrarSesion()).rejects.toEqual(new Redireccion("/login"));
    expect(supabase.pedidos("auth.signOut")).toEqual([[["signOut"]], [["signOut", { scope: "local" }]]]);
  });
});
