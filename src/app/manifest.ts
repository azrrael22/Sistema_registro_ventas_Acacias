import type { MetadataRoute } from "next";

// Para instalarla en el celular («Agregar a la pantalla de inicio»): se abre a pantalla completa, sin
// la barra del navegador. Los íconos salen de la Marca (ver public/iconos); el proxy no pasa por aquí.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ventas Las Acacias",
    short_name: "Acacias",
    description: "Registro de ventas de los empleados de Las Acacias",
    lang: "es-CO",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ee",
    theme_color: "#047857",
    icons: [
      { src: "/iconos/192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
