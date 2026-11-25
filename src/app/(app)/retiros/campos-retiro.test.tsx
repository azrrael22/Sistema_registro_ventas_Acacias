// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { dinero } from "@/lib/formato";
import { CamposRetiro } from "./campos-retiro";

const categorias = [
  { id: 1, nombre: "Bebidas", saldo: 50000 },
  { id: 2, nombre: "Snacks", saldo: 8000 },
];

const abrir = (lista = categorias) => {
  const usuario = userEvent.setup();
  render(
    <form aria-label="Retiro">
      <CamposRetiro categorias={lista} />
    </form>,
  );
  return usuario;
};
const monto = () => screen.getByRole("spinbutton", { name: "Monto" });
const boton = () => screen.getByRole("button");
const pista = () => document.getElementById("pista-monto")!.textContent;

describe("CamposRetiro", () => {
  test("muestra lo disponible en cada categoría", () => {
    abrir();
    expect(screen.getByRole("option", { name: `Bebidas · disponible ${dinero(50000)}` })).toBeTruthy();
    expect(screen.getByRole("option", { name: `Snacks · disponible ${dinero(8000)}` })).toBeTruthy();
    expect(pista()).toBe(`Disponible: ${dinero(50000)}`);
    expect(boton().textContent).toBe("Registrar retiro");
  });

  test("el botón dice cuánto se retira, para que un cero de más se vea", async () => {
    const usuario = abrir();
    await usuario.type(monto(), "20000");
    expect(pista()).toBe(`${dinero(20000)} de ${dinero(50000)} disponibles`);
    expect(boton().textContent).toBe(`Retirar ${dinero(20000)}`);
    expect(monto().getAttribute("aria-invalid")).toBeNull();
  });

  test("más que lo disponible no se puede enviar", async () => {
    const usuario = abrir();
    await usuario.type(monto(), "60000");
    expect(pista()).toBe(`Supera lo disponible en esta categoría (${dinero(50000)})`);
    expect(monto().getAttribute("aria-invalid")).toBe("true");
    expect(boton()).toHaveProperty("disabled", true);
    expect(boton().textContent).toBe("Registrar retiro");
  });

  test("todo el saldo sí se puede retirar", async () => {
    const usuario = abrir();
    await usuario.type(monto(), "50000");
    expect(boton()).toHaveProperty("disabled", false);
    expect(boton().textContent).toBe(`Retirar ${dinero(50000)}`);
  });

  test("al cambiar de categoría se compara con su saldo", async () => {
    const usuario = abrir();
    await usuario.type(monto(), "20000");
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Categoría" }), "2");
    expect(pista()).toBe(`Supera lo disponible en esta categoría (${dinero(8000)})`);
  });

  test.each(["1500.5", "0"])("«%s» no es un monto: solo muestra lo disponible", async (texto) => {
    const usuario = abrir();
    await usuario.type(monto(), texto);
    expect(pista()).toBe(`Disponible: ${dinero(50000)}`);
    expect(boton().textContent).toBe("Registrar retiro");
  });

  test("al vaciarse el formulario (después de enviar) vuelve a empezar", async () => {
    const usuario = abrir();
    await usuario.selectOptions(screen.getByRole("combobox", { name: "Categoría" }), "2");
    await usuario.type(monto(), "5000");
    act(() => {
      screen.getByRole("form", { name: "Retiro" }).dispatchEvent(new Event("reset"));
    });
    expect(monto()).toHaveProperty("value", "");
    expect(pista()).toBe(`Disponible: ${dinero(50000)}`);
  });

  test("sin categorías no hay saldo", () => {
    abrir([]);
    expect(pista()).toBe(`Disponible: ${dinero(0)}`);
  });
});
