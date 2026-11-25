import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

// Rutas desde el directorio donde corre Vitest, no desde este archivo: mutator corre cada mutante
// en una copia del proyecto (target/mutation-workers) donde este archivo es un enlace al original,
// y con import.meta.url «@» apuntaría al src original en vez de al archivo mutado.
const ruta = (relativa: string) => resolve(relativa);

// Pruebas de JS: junto al código (x.ts → x.test.ts). Corren en Node; las de componentes
// (.test.tsx) piden jsdom con el comentario `// @vitest-environment jsdom`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": ruta("./src"),
      // server-only lanza un error fuera de un Server Component; en las pruebas no hace nada
      "server-only": ruta("./src/test/vacio.ts"),
    },
  },
  test: {
    environment: "node",
    // target/: las copias del proyecto donde mutator corre cada mutante
    exclude: [...configDefaults.exclude, "target/**"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/lib/database.types.ts"],
    },
  },
});
