// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ayer, dinero, hoy } from "@/lib/formato";
import { registrarVenta } from "../actions";
import { Carrito } from "./carrito";

vi.mock("../actions", () => ({ registrarVenta: vi.fn() }));

// Ya vienen ordenados por categoría y nombre, como los manda la página
const productos = [
  { id: 1, nombre: "Agua", precio: 2000, foto: null, categoria: "Bebidas", stock: 0 },
  { id: 2, nombre: "Gaseosa", precio: 2500, foto: null, categoria: "Bebidas", stock: 2 },
  { id: 4, nombre: "Jugo", precio: 3000, foto: null, categoria: "Bebidas", stock: 10 },
  { id: 3, nombre: "Tinto", precio: 1500, foto: null, categoria: "Cafetería", stock: null },
];

const tinto = productos.find((p) => p.nombre === "Tinto")!;

// Cada prueba es un empleado distinto: la venta guardada es por empleado
let numero = 0;
let empleadoId = "";
const clave = () => `acacias:venta:${empleadoId}`;

beforeEach(() => {
  empleadoId = `empleado-${++numero}`;
  localStorage.clear();
  vi.mocked(registrarVenta).mockReset();
});
afterEach(() => {
  conexion(true);
});

function conexion(enLinea: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => enLinea });
  act(() => {
    window.dispatchEvent(new Event(enLinea ? "online" : "offline"));
  });
}

const abrir = (lista = productos) => {
  const usuario = userEvent.setup();
  const vista = render(<Carrito productos={lista} empleadoId={empleadoId} />);
  return { usuario, ...vista };
};

const panel = () => within(screen.getByRole("complementary", { name: "Venta actual" }));
const agregar = (nombre: string) => screen.getAllByRole("button", { name: `Agregar 1 ${nombre}` })[0];
const quitar = (nombre: string) => screen.getByRole("button", { name: `Quitar 1 ${nombre}` });
const cantidad = (nombre: string) => screen.getByRole("spinbutton", { name: `Cantidad de ${nombre}` });
const botonVenta = () => panel().getByRole("button", { name: /Registrar venta|Selecciona productos|Revisa los precios|Sin conexión|Registrando…/ });
// La fila del total: unidades (o «Sin productos»), «Ver detalle» y el total
const filaTotal = () => panel().getByText(/^(\d+ unidad|Sin productos)/).parentElement!.textContent;
const precioDe = (nombre: string) => {
  const linea = panel().getByText(new RegExp(`× ${nombre}$`)).closest("li")!;
  return within(linea).getByLabelText("Precio c/u");
};

describe("catálogo", () => {
  test("muestra los productos por categoría, con su stock", () => {
    abrir();
    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Cafetería" })).toBeTruthy();
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect(screen.getByText("Quedan 2")).toBeTruthy();
    expect(screen.getByText("10 en stock")).toBeTruthy();
    // Sin inventario no muestra stock
    expect(agregar("Tinto").textContent).toBe(`Tinto${dinero(1500)}`);
  });

  test("un producto agotado no se puede agregar", () => {
    abrir();
    expect(agregar("Agua")).toHaveProperty("disabled", true);
    expect(cantidad("Agua")).toHaveProperty("disabled", true);
  });

  test("sin productos en la venta", () => {
    abrir();
    expect(panel().getByText("Toca un producto para agregarlo")).toBeTruthy();
    expect(filaTotal()).toBe(`Sin productos${dinero(0)}`);
    expect(botonVenta().textContent).toBe("Selecciona productos");
    expect(botonVenta()).toHaveProperty("disabled", true);
    expect(quitar("Gaseosa")).toHaveProperty("disabled", true);
  });
});

describe("cantidades", () => {
  test("tocar un producto suma una unidad", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.click(agregar("Tinto"));
    expect(cantidad("Tinto")).toHaveProperty("value", "2");
    expect(panel().getByText("× Tinto").textContent).toBe("2 × Tinto");
    expect(filaTotal()).toBe(`2 unidades · Ver detalle${dinero(3000)}`);
    expect(botonVenta().textContent).toBe("Registrar venta");
  });

  test("el + del control de cantidad también suma", async () => {
    const { usuario } = abrir();
    const [, mas] = screen.getAllByRole("button", { name: "Agregar 1 Tinto" });
    await usuario.click(mas);
    expect(cantidad("Tinto")).toHaveProperty("value", "1");
  });

  test("una unidad se dice en singular", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    expect(filaTotal()).toBe(`1 unidad · Ver detalle${dinero(1500)}`);
  });

  test("no pasa del stock", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Gaseosa"));
    await usuario.click(agregar("Gaseosa"));
    expect(cantidad("Gaseosa")).toHaveProperty("value", "2");
    expect(agregar("Gaseosa")).toHaveProperty("disabled", true);
    await usuario.clear(cantidad("Gaseosa"));
    await usuario.type(cantidad("Gaseosa"), "9");
    expect(cantidad("Gaseosa")).toHaveProperty("value", "2");
  });

  test("sin inventario no hay tope", async () => {
    const { usuario } = abrir();
    await usuario.type(cantidad("Tinto"), "40");
    expect(cantidad("Tinto")).toHaveProperty("value", "40");
  });

  test("escribir una cantidad negativa o con decimales", async () => {
    const { usuario } = abrir();
    await usuario.type(cantidad("Tinto"), "3.7");
    expect(cantidad("Tinto")).toHaveProperty("value", "3");
    await usuario.clear(cantidad("Tinto"));
    expect(cantidad("Tinto")).toHaveProperty("value", "0");
  });

  test("quitar una unidad y quitar el producto", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.click(agregar("Tinto"));
    await usuario.click(quitar("Tinto"));
    expect(cantidad("Tinto")).toHaveProperty("value", "1");
    await usuario.click(panel().getByRole("button", { name: "Quitar Tinto de la venta" }));
    expect(cantidad("Tinto")).toHaveProperty("value", "0");
    expect(panel().getByText("Toca un producto para agregarlo")).toBeTruthy();
  });

  test("vaciar la venta", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.click(agregar("Gaseosa"));
    await usuario.click(panel().getByRole("button", { name: "Vaciar venta" }));
    expect(filaTotal()).toBe(`Sin productos${dinero(0)}`);
    expect(panel().queryByRole("button", { name: "Vaciar venta" })).toBeNull();
    expect(localStorage.getItem(clave())).toBeNull();
  });
});

describe("descuentos", () => {
  test("un precio menor es un descuento", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Gaseosa"));
    await usuario.click(agregar("Gaseosa"));
    await usuario.clear(precioDe("Gaseosa"));
    await usuario.type(precioDe("Gaseosa"), "2000");
    expect(panel().getByText("Descuento").parentElement!.textContent).toBe(`Descuento−${dinero(1000)}`);
    expect(filaTotal()).toBe(`2 unidades · Ver detalle${dinero(4000)}`);
    // La tarjeta muestra el precio de lista tachado
    expect(agregar("Gaseosa").textContent).toBe(`Gaseosaantes ${dinero(2500)} ${dinero(2000)}Quedan 2`);
  });

  test.each([
    ["mayor que el de lista", "3000"],
    ["vacío", ""],
  ])("un precio %s no se puede registrar", async (_, precio) => {
    const { usuario } = abrir();
    await usuario.click(agregar("Gaseosa"));
    await usuario.clear(precioDe("Gaseosa"));
    if (precio) await usuario.type(precioDe("Gaseosa"), precio);
    expect(panel().getByText(`Entre ${dinero(0)} y ${dinero(2500)}`.replace(/\s/g, " "))).toBeTruthy();
    expect(precioDe("Gaseosa").getAttribute("aria-invalid")).toBe("true");
    expect(botonVenta().textContent).toBe("Revisa los precios");
    expect(botonVenta()).toHaveProperty("disabled", true);
    // Sin «Ver detalle»: el detalle queda abierto para corregirlo
    expect(filaTotal()).toBe(`1 unidad${dinero(2500)}`);
  });

  test("al quitar el producto vuelve a su precio de lista", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Gaseosa"));
    await usuario.clear(precioDe("Gaseosa"));
    await usuario.type(precioDe("Gaseosa"), "1000");
    await usuario.click(quitar("Gaseosa"));
    await usuario.click(agregar("Gaseosa"));
    expect(precioDe("Gaseosa")).toHaveProperty("value", "2500");
  });
});

describe("buscar y filtrar", () => {
  test("por nombre o categoría", async () => {
    const { usuario } = abrir();
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar producto" }), "  GASEO ");
    expect(screen.queryByText("Tinto")).toBeNull();
    expect(agregar("Gaseosa")).toBeTruthy();
    await usuario.clear(screen.getByRole("searchbox", { name: "Buscar producto" }));
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar producto" }), "cafe");
    expect(screen.queryByText("Gaseosa")).toBeNull();
    expect(agregar("Tinto")).toBeTruthy();
  });

  test("sin resultados se puede limpiar la búsqueda", async () => {
    const { usuario } = abrir();
    await usuario.click(screen.getByRole("button", { name: "Cafetería" }));
    await usuario.type(screen.getByRole("searchbox", { name: "Buscar producto" }), "gaseosa");
    expect(screen.getByText("Ningún producto coincide con la búsqueda")).toBeTruthy();
    await usuario.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(screen.getByRole("searchbox", { name: "Buscar producto" })).toHaveProperty("value", "");
    expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
    expect(agregar("Gaseosa")).toBeTruthy();
  });

  test("por categoría, sin repetir su encabezado", async () => {
    const { usuario } = abrir();
    expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("true");
    await usuario.click(screen.getByRole("button", { name: "Bebidas" }));
    expect(screen.getByRole("button", { name: "Bebidas" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("heading", { name: "Bebidas" })).toBeNull();
    expect(screen.queryByText("Tinto")).toBeNull();
    await usuario.click(screen.getByRole("button", { name: "Todos" }));
    expect(agregar("Tinto")).toBeTruthy();
  });

  test("con una sola categoría no hay filtro", () => {
    abrir([tinto]);
    expect(screen.queryByRole("group", { name: "Filtrar por categoría" })).toBeNull();
  });

  test("los productos sin categoría van sin encabezado", () => {
    abrir([{ ...tinto, categoria: "" }]);
    expect(screen.queryByRole("heading", { level: 2, name: "" })).toBeNull();
    expect(agregar("Tinto")).toBeTruthy();
  });
});

describe("detalle en el celular", () => {
  test("«Ver detalle» abre y cierra el detalle", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    const detalle = document.getElementById("detalle-venta")!;
    expect(detalle.className).toContain("hidden");
    await usuario.click(panel().getByRole("button", { name: "Ver detalle" }));
    expect(detalle.className).not.toContain("hidden");
    expect(panel().getByRole("button", { name: "Ocultar detalle" }).getAttribute("aria-expanded")).toBe("true");
    await usuario.click(panel().getByRole("button", { name: "Ocultar detalle" }));
    expect(detalle.className).toContain("hidden");
  });
});

describe("registrar", () => {
  const llenar = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(agregar("Gaseosa"));
    await usuario.click(agregar("Tinto"));
    await usuario.click(agregar("Tinto"));
    await usuario.clear(precioDe("Gaseosa"));
    await usuario.type(precioDe("Gaseosa"), "2000");
    await usuario.type(panel().getByLabelText("Nota (opcional)"), "pagó con 10 mil");
  };

  test("envía los productos, el descuento y la nota; luego vacía el carrito", async () => {
    vi.mocked(registrarVenta).mockResolvedValue({ ok: "Venta registrada" });
    const { usuario } = abrir();
    await llenar(usuario);
    await usuario.click(panel().getByRole("button", { name: "Ver detalle" }));
    await usuario.click(botonVenta());
    expect(registrarVenta).toHaveBeenCalledWith(
      [
        { producto_id: 2, cantidad: 1, precio_unitario: 2000 },
        { producto_id: 3, cantidad: 2, precio_unitario: undefined },
      ],
      "pagó con 10 mil",
    );
    expect(panel().getByRole("status").textContent).toBe(`Venta registrada · 3 unidades · ${dinero(5000)}`);
    expect(filaTotal()).toBe(`Sin productos${dinero(0)}`);
    expect(panel().getByLabelText("Nota (opcional)")).toHaveProperty("value", "");
    expect(document.getElementById("detalle-venta")!.className).toContain("hidden");
    expect(localStorage.getItem(clave())).toBeNull();
  });

  test("mientras se registra, el botón lo dice", async () => {
    let terminar: (r: { ok: string }) => void = () => {};
    vi.mocked(registrarVenta).mockReturnValue(new Promise((r) => (terminar = r)));
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.click(botonVenta());
    expect(botonVenta().textContent).toBe("Registrando…");
    expect(botonVenta()).toHaveProperty("disabled", true);
    await act(async () => terminar({ ok: "Venta registrada" }));
    expect(botonVenta().textContent).toBe("Selecciona productos");
  });

  test("si la base de datos no la acepta, se dice por qué y el carrito sigue", async () => {
    vi.mocked(registrarVenta).mockResolvedValue({ error: "No hay suficiente stock de Gaseosa" });
    const { usuario } = abrir();
    await usuario.click(agregar("Gaseosa"));
    await usuario.click(botonVenta());
    expect(panel().getByRole("alert").textContent).toBe("No hay suficiente stock de Gaseosa");
    expect(cantidad("Gaseosa")).toHaveProperty("value", "1");
    // Al cambiar la venta, el aviso se va
    await usuario.click(agregar("Gaseosa"));
    expect(panel().queryByRole("alert")).toBeNull();
  });

  test("si se cortó la conexión, dice que revise en Ventas antes de repetirla", async () => {
    vi.mocked(registrarVenta).mockRejectedValue(new TypeError("Failed to fetch"));
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.click(botonVenta());
    expect(panel().getByRole("alert").textContent).toBe(
      "No se pudo confirmar si la venta quedó registrada. Revísalo en Ventas antes de registrarla otra vez.",
    );
    expect(cantidad("Tinto")).toHaveProperty("value", "1");
  });

  test("sin conexión no se puede registrar y el carrito queda guardado", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    conexion(false);
    expect(botonVenta().textContent).toBe("Sin conexión");
    expect(botonVenta()).toHaveProperty("disabled", true);
    expect(panel().getByRole("status").textContent).toBe(
      "El carrito queda guardado en este celular: registra la venta cuando vuelva la conexión.",
    );
    conexion(true);
    expect(botonVenta().textContent).toBe("Registrar venta");
  });

  test("sin conexión y sin productos no hay aviso", () => {
    abrir();
    conexion(false);
    expect(panel().queryByRole("status")).toBeNull();
  });
});

describe("venta guardada en el celular", () => {
  const guardar = (venta: object) => localStorage.setItem(clave(), JSON.stringify(venta));

  test("se guarda mientras se arma", async () => {
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    await usuario.type(panel().getByLabelText("Nota (opcional)"), "x");
    expect(JSON.parse(localStorage.getItem(clave())!)).toEqual({ cantidades: { 3: 1 }, precios: {}, nota: "x", dia: hoy() });
  });

  test("la de hoy se recupera al volver", () => {
    guardar({ cantidades: { 3: 2 }, precios: {}, nota: "mesa 4", dia: hoy() });
    abrir();
    expect(cantidad("Tinto")).toHaveProperty("value", "2");
    expect(panel().getByLabelText("Nota (opcional)")).toHaveProperty("value", "mesa 4");
  });

  test("solo con una nota también se guarda", async () => {
    const { usuario } = abrir();
    await usuario.type(panel().getByLabelText("Nota (opcional)"), "fiado");
    expect(JSON.parse(localStorage.getItem(clave())!)).toMatchObject({ nota: "fiado" });
    await usuario.clear(panel().getByLabelText("Nota (opcional)"));
    expect(localStorage.getItem(clave())).toBeNull();
  });

  test.each([
    ["la de ayer", { cantidades: { 3: 2 }, precios: {}, nota: "", dia: ayer() }],
    ["una sin cantidades", { precios: {}, nota: "", dia: hoy() }],
    ["una sin precios", { cantidades: { 3: 2 }, nota: "", dia: hoy() }],
  ])("%s se descarta", (_, venta) => {
    guardar(venta);
    abrir();
    expect(cantidad("Tinto")).toHaveProperty("value", "0");
  });

  test("datos dañados se descartan", () => {
    localStorage.setItem(clave(), "{no es json");
    abrir();
    expect(filaTotal()).toBe(`Sin productos${dinero(0)}`);
  });

  test("una nota que no es texto se lee como texto", () => {
    guardar({ cantidades: { 3: 1 }, precios: {}, nota: 7, dia: hoy() });
    abrir();
    expect(panel().getByLabelText("Nota (opcional)")).toHaveProperty("value", "7");
  });

  test("sin nota guardada, la nota es vacía", () => {
    guardar({ cantidades: { 3: 1 }, precios: {}, dia: hoy() });
    abrir();
    expect(panel().getByLabelText("Nota (opcional)")).toHaveProperty("value", "");
  });

  test("con más unidades que el stock de ahora, cuenta hasta el stock", () => {
    guardar({ cantidades: { 2: 5, 1: 3 }, precios: {}, nota: "", dia: hoy() });
    abrir();
    expect(cantidad("Gaseosa")).toHaveProperty("value", "2");
    expect(cantidad("Agua")).toHaveProperty("value", "0");
    expect(filaTotal()).toBe(`2 unidades · Ver detalle${dinero(5000)}`);
  });

  test("un producto que ya no se vende no aparece", () => {
    guardar({ cantidades: { 99: 1, 3: 1 }, precios: {}, nota: "", dia: hoy() });
    abrir();
    expect(filaTotal()).toBe(`1 unidad · Ver detalle${dinero(1500)}`);
  });

  test("la misma venta abierta en otra pestaña se actualiza", () => {
    abrir();
    guardar({ cantidades: { 3: 4 }, precios: {}, nota: "", dia: hoy() });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: clave() }));
    });
    expect(cantidad("Tinto")).toHaveProperty("value", "4");
  });

  test("los cambios de otras claves no la tocan", () => {
    abrir();
    guardar({ cantidades: { 3: 4 }, precios: {}, nota: "", dia: hoy() });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "otra-clave" }));
    });
    expect(cantidad("Tinto")).toHaveProperty("value", "0");
  });

  test("si el navegador no deja guardar, el carrito funciona igual", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    const { usuario } = abrir();
    await usuario.click(agregar("Tinto"));
    expect(cantidad("Tinto")).toHaveProperty("value", "1");
    setItem.mockRestore();
  });

  test("si el navegador no deja leer, empieza vacío", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    abrir();
    expect(filaTotal()).toBe(`Sin productos${dinero(0)}`);
    getItem.mockRestore();
  });
});

describe("panel en escritorio", () => {
  test("mide su alto para quedar a la vista", () => {
    const observados: Element[] = [];
    let avisar: () => void = () => {};
    const desconectar = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          avisar = cb;
        }
        observe(e: Element) {
          observados.push(e);
        }
        disconnect = desconectar;
      },
    );
    const { unmount } = abrir();
    const aside = screen.getByRole("complementary", { name: "Venta actual" });
    expect(observados).toEqual([aside]);
    Object.defineProperty(aside, "offsetHeight", { configurable: true, value: 640 });
    avisar();
    expect(aside.style.getPropertyValue("--alto-tiquete")).toBe("640px");
    unmount();
    expect(desconectar).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
