import { afterEach, describe, expect, test, vi } from "vitest";
import {
  agruparPor,
  ayer,
  diaDe,
  dinero,
  dineroCorto,
  fecha,
  fechaCorta,
  horaDe,
  hoy,
  porcentaje,
  porDia,
  rangoFechas,
  stockBajo,
  textoStock,
  tituloDia,
} from "@/lib/formato";

// Intl separa la cifra del símbolo con un espacio duro
const nb = " ";

afterEach(() => {
  vi.useRealTimers();
});

// Reloj fijo: 25 nov 2026 a las 3:00 a. m. UTC, que en Colombia (UTC−5) todavía es el 24 nov
const elRelojDice = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

describe("dinero", () => {
  test("pesos colombianos sin decimales", () => {
    expect(dinero(1500)).toBe(`$${nb}1.500`);
    expect(dinero("2500.4")).toBe(`$${nb}2.500`);
    expect(dinero(-3000)).toBe(`-$${nb}3.000`);
  });

  test("sin valor es $ 0", () => {
    expect(dinero(null)).toBe(`$${nb}0`);
    expect(dinero(undefined)).toBe(`$${nb}0`);
  });

  test("corto para los gráficos", () => {
    expect(dineroCorto(48000)).toBe(`$48${nb}k`);
    expect(dineroCorto(1500000)).toBe(`$1,5${nb}M`);
  });
});

describe("stock", () => {
  test.each([
    [null, "Sin inventario"],
    [-2, "Agotado"],
    [0, "Agotado"],
    [1, "Queda 1"],
    [2, "Quedan 2"],
    [3, "Quedan 3"],
    [4, "4 en stock"],
  ])("%s unidades → «%s»", (n, texto) => {
    expect(textoStock(n)).toBe(texto);
  });

  test.each([
    [null, false],
    [0, true],
    [3, true],
    [4, false],
  ])("stock %s es bajo: %s", (n, bajo) => {
    expect(stockBajo(n)).toBe(bajo);
  });
});

describe("porcentaje", () => {
  test("sin signo", () => {
    expect(porcentaje(0.25)).toBe("25%");
  });

  test("con signo, salvo el cero", () => {
    expect(porcentaje(0.25, true)).toBe("+25%");
    expect(porcentaje(-0.1, true)).toBe("-10%");
    expect(porcentaje(0, true)).toBe("0%");
  });
});

describe("fechas", () => {
  test("fechaCorta no pasa por Date: el día no se corre", () => {
    expect(fechaCorta("2026-01-01")).toBe("1 ene 2026");
    expect(fechaCorta("2026-12-31", false)).toBe("31 dic");
  });

  test("rangoFechas repite el año solo si cambia", () => {
    expect(rangoFechas("2026-10-12", "2026-11-12")).toBe("12 oct – 12 nov 2026");
    expect(rangoFechas("2025-12-20", "2026-01-05")).toBe("20 dic 2025 – 5 ene 2026");
  });

  test("fecha, día y hora van en hora de Colombia", () => {
    // 3:00 a. m. UTC del 25 nov = 10:00 p. m. del 24 nov en Bogotá
    expect(fecha("2026-11-25T03:00:00Z")).toBe("24 nov 2026, 10:00 p. m.");
    expect(diaDe("2026-11-25T03:00:00Z")).toBe("2026-11-24");
    expect(horaDe("2026-11-10T18:35:00Z")).toBe("1:35 p. m.");
  });

  test("hoy y ayer son los de Colombia", () => {
    elRelojDice("2026-11-25T03:00:00Z");
    expect(hoy()).toBe("2026-11-24");
    expect(ayer()).toBe("2026-11-23");
  });

  test("ayer resta un día al calendario, también al cambiar de año", () => {
    elRelojDice("2026-01-01T15:00:00Z");
    expect(ayer()).toBe("2025-12-31");
  });

  test("tituloDia distingue hoy y ayer", () => {
    elRelojDice("2026-11-25T15:00:00Z");
    expect(tituloDia("2026-11-25")).toBe("Hoy · 25 nov 2026");
    expect(tituloDia("2026-11-24")).toBe("Ayer · 24 nov 2026");
    expect(tituloDia("2026-11-23")).toBe("23 nov 2026");
  });
});

describe("porDia", () => {
  test("agrupa por día de Colombia sin cambiar el orden", () => {
    const ventas = [
      { id: 3, fecha: "2026-11-25T15:00:00Z" },
      { id: 2, fecha: "2026-11-25T03:00:00Z" }, // 24 nov en Bogotá
      { id: 1, fecha: "2026-11-24T20:00:00Z" },
    ];
    expect(porDia(ventas)).toEqual([
      ["2026-11-25", [ventas[0]]],
      ["2026-11-24", [ventas[1], ventas[2]]],
    ]);
  });

  test("una lista vacía no tiene días", () => {
    expect(porDia([])).toEqual([]);
  });
});

describe("agruparPor", () => {
  test("los grupos van en el orden de su primer elemento, y cada uno en su orden", () => {
    expect(agruparPor(["pera", "kiwi", "piña", "kaki", "uva"], (f) => f[0])).toEqual([
      ["p", ["pera", "piña"]],
      ["k", ["kiwi", "kaki"]],
      ["u", ["uva"]],
    ]);
  });
});
