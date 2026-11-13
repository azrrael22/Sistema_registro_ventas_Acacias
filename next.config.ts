import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos de productos: el navegador las reduce antes de subirlas, pero si no puede
    // leerlas envía la original (Vercel no acepta más de 4,5 MB por petición)
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
