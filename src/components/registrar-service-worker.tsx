"use client";

import { useEffect } from "react";

// Registra public/sw.js, que muestra una página propia cuando la app se abre o se recarga sin
// conexión. Solo en producción: en desarrollo, un servidor apagado parecería falta de internet.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => {
      console.error("No se pudo registrar el service worker:", e);
    });
  }, []);
  return null;
}
