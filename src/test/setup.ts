import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library no limpia sola sin los globals de Vitest: cada prueba empieza con el DOM vacío
afterEach(() => cleanup());

// jsdom no trae ResizeObserver (lo usa el panel «Venta actual» de Vender)
if (typeof window !== "undefined") {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
