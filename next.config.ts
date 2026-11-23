import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos de productos: el navegador las reduce antes de subirlas, pero si no puede
    // leerlas envía la original (Vercel no acepta más de 4,5 MB por petición)
    serverActions: { bodySizeLimit: "4.5mb" },
    // Avisos de actualización: solo cuando haya un aviso de seguridad
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        // Service worker (página sin conexión): el navegador siempre revisa si hay una versión
        // nueva, y el script solo puede cargar código de la propia app
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
