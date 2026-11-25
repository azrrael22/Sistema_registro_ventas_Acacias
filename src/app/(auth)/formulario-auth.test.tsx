// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { iniciarSesion, registrarse } from "./actions";
import { FormularioAuth } from "./formulario-auth";

vi.mock("./actions", () => ({ iniciarSesion: vi.fn(), registrarse: vi.fn() }));

const replace = vi.fn();
beforeEach(() => {
  vi.mocked(iniciarSesion).mockReset();
  vi.mocked(registrarse).mockReset();
  replace.mockReset();
  vi.stubGlobal("location", { ...window.location, replace });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const campo = (nombre: string) => screen.getByLabelText(nombre, { selector: "input, select" }) as HTMLInputElement;
const boton = () => screen.getByRole("button", { name: /Ingresar|Crear cuenta|Entrando…|Un momento…/ });
const enviado = (accion: typeof iniciarSesion) => Object.fromEntries(vi.mocked(accion).mock.calls[0][1] as FormData);

describe("ingresar", () => {
  test("pide correo y contraseña, con el enlace para recuperarla y para registrarse", () => {
    render(<FormularioAuth modo="login" />);
    expect(campo("Correo").autocomplete).toBe("email");
    expect(campo("Contraseña").autocomplete).toBe("current-password");
    expect(campo("Contraseña").minLength).toBe(-1);
    expect(screen.queryByLabelText("Confirmar contraseña")).toBeNull();
    expect(screen.queryByLabelText("Primer nombre")).toBeNull();
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).getAttribute("href")).toBe("/recuperar");
    expect(screen.getByRole("link", { name: "Regístrate" }).getAttribute("href")).toBe("/registro");
    expect(screen.getByText(/¿No tienes cuenta\?/)).toBeTruthy();
    expect(boton().textContent).toBe("Ingresar");
  });

  test("envía el destino al que vuelve después de ingresar", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ error: "x" });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" destino="/notificaciones/12" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave");
    await usuario.click(boton());
    expect(enviado(iniciarSesion)).toEqual({ destino: "/notificaciones/12", email: "ana@acacias.test", password: "clave" });
  });

  test("sin destino no envía uno", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ error: "x" });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave");
    await usuario.click(boton());
    expect(enviado(iniciarSesion)).toEqual({ email: "ana@acacias.test", password: "clave" });
  });

  test("con un error, lo dice y conserva el correo", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ error: "Correo o contraseña incorrectos", valores: { email: "ana@acacias.test" } });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "mala");
    await usuario.click(boton());
    expect((await screen.findByRole("alert")).textContent).toBe("Correo o contraseña incorrectos");
    expect(campo("Correo").value).toBe("ana@acacias.test");
  });

  test("si la acción falla sin responder, lo explica", async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(new TypeError("Failed to fetch"));
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave");
    await usuario.click(boton());
    expect((await screen.findByRole("alert")).textContent).toMatch(/^Se perdió la conexión con el servidor/);
  });

  test("al ingresar con destino, va allá con una navegación completa", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ ir: "/notificaciones/12" });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" destino="/notificaciones/12" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave");
    await usuario.click(boton());
    expect(await screen.findByRole("button", { name: "Entrando…" })).toHaveProperty("disabled", true);
    expect(replace).toHaveBeenCalledWith("/notificaciones/12");
  });

  test("un destino de otro sitio no se sigue", async () => {
    vi.mocked(iniciarSesion).mockResolvedValue({ ir: "//otro.com" });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="login" />);
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave");
    await usuario.click(boton());
    expect(await screen.findByRole("button", { name: "Ingresar" })).toHaveProperty("disabled", false);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("registrarse", () => {
  test("pide nombre, documento, correo y la contraseña dos veces", () => {
    render(<FormularioAuth modo="registro" destino="/ventas" />);
    for (const etiqueta of ["Primer nombre", "Primer apellido", "Segundo apellido", "Tipo de documento", "Número de documento", "Correo", "Confirmar contraseña"]) {
      expect(campo(etiqueta)).toBeTruthy();
    }
    expect(campo("Contraseña").autocomplete).toBe("new-password");
    expect(campo("Contraseña").minLength).toBe(8);
    expect(screen.queryByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ingresa" }).getAttribute("href")).toBe("/login");
    expect(screen.getByText(/¿Ya tienes cuenta\?/)).toBeTruthy();
    expect(boton().textContent).toBe("Crear cuenta");
    // El destino solo es del login
    expect(document.querySelector('input[name="destino"]')).toBeNull();
  });

  test("con un error conserva lo escrito", async () => {
    vi.mocked(registrarse).mockResolvedValue({
      error: "Ese documento ya está registrado",
      valores: { primer_nombre: "Ana", tipo_documento: "CC", numero_documento: "1032456", email: "ana@acacias.test" },
    });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="registro" />);
    await usuario.type(campo("Primer nombre"), "Ana");
    await usuario.type(campo("Primer apellido"), "Rojas");
    await usuario.type(campo("Segundo apellido"), "Díaz");
    await usuario.selectOptions(campo("Tipo de documento"), "CC");
    await usuario.type(campo("Número de documento"), "1032456");
    await usuario.type(campo("Correo"), "ana@acacias.test");
    await usuario.type(campo("Contraseña"), "clave-segura");
    await usuario.type(campo("Confirmar contraseña"), "clave-segura");
    await usuario.click(boton());
    expect((await screen.findByRole("alert")).textContent).toBe("Ese documento ya está registrado");
    expect(campo("Primer nombre").value).toBe("Ana");
    expect(campo("Tipo de documento").value).toBe("CC");
    expect(campo("Número de documento").value).toBe("1032456");
    expect(campo("Correo").value).toBe("ana@acacias.test");
  });

  test("un tipo de documento que no existe no se elige", async () => {
    vi.mocked(registrarse).mockResolvedValue({ error: "Elige el tipo de documento", valores: { tipo_documento: "NIT" } });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="registro" />);
    // Sin required, para poder enviar el formulario incompleto
    for (const el of document.querySelectorAll("[required]")) el.removeAttribute("required");
    await usuario.click(boton());
    await screen.findByRole("alert");
    expect(campo("Tipo de documento").value).toBe("");
  });

  test("al crear la cuenta, solo queda el aviso", async () => {
    vi.mocked(registrarse).mockResolvedValue({ ok: "Te enviamos un correo para confirmar tu cuenta." });
    const usuario = userEvent.setup();
    render(<FormularioAuth modo="registro" />);
    for (const el of document.querySelectorAll("[required]")) el.removeAttribute("required");
    await usuario.click(boton());
    expect((await screen.findByRole("status")).textContent).toBe("Te enviamos un correo para confirmar tu cuenta.");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
