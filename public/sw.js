// Service worker de Ventas Las Acacias. Solo atiende las navegaciones: abrir la app, recargar y las
// recargas completas que hace Next cuando cambia de pantalla sin red. Si la red falla, responde con
// una página propia que se recarga sola cuando vuelve la conexión. No guarda nada de la app en el
// celular (ni pantallas ni datos): no hay nada que borrar al salir ni nada privado en caché.
// Lo registra src/components/registrar-service-worker.tsx, solo en producción.

// Misma cara que PantallaCentrada (Marca, título, texto y botón), con la letra del sistema: sin red
// no se pueden pedir las fuentes de la app.
const PAGINA_SIN_CONEXION = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#047857">
<title>Sin conexión · Ventas Las Acacias</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    padding: 2.5rem 1rem; background: #fafaf9; color: #1c1917;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased;
  }
  main { width: 100%; max-width: 24rem; }
  svg { display: block; width: 2.5rem; height: 2.5rem; color: #047857; }
  h1 { margin: 1rem 0 0; font-size: 1.5rem; line-height: 2rem; font-weight: 500; }
  p { margin: .5rem 0 0; font-size: .875rem; line-height: 1.25rem; color: #57534e; }
  button {
    margin-top: 2rem; width: 100%; min-height: 2.75rem; border: 0; border-radius: .5rem; cursor: pointer;
    background: #047857; color: #fff; font: inherit; font-size: .875rem; font-weight: 500;
    box-shadow: 0 1px 2px rgb(0 0 0 / .05);
  }
  button:hover { background: #065f46; }
  button:focus-visible { outline: 2px solid #047857; outline-offset: 2px; }
  @media (prefers-color-scheme: dark) {
    body { background: #1c1917; color: #fafaf9; }
    p { color: #a8a29e; }
    button { background: #059669; }
    button:hover { background: #10b981; }
    button:focus-visible { outline-color: #10b981; }
  }
</style>
</head>
<body>
<main>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 19H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v3"/>
      <path d="M2 6h4M2 10h4M2 14h4M8 6h3"/>
    </g>
    <path fill="currentColor" fill-rule="evenodd" d="M13.5 8h7a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-10A2.5 2.5 0 0 1 13.5 8ZM14 11.75h6v2.5h-6ZM14 16.75h2.5v2.5H14ZM17.5 16.75H20v2.5h-2.5Z"/>
  </svg>
  <h1>Sin conexión a internet</h1>
  <p>Ventas Las Acacias necesita internet para abrir esta pantalla. Cuando vuelva la conexión, se carga sola.</p>
  <p>Si estabas armando una venta, sigue guardada en este celular.</p>
  <button type="button" id="reintentar">Reintentar</button>
</main>
<script>
  const recargar = () => location.reload();
  document.getElementById("reintentar").addEventListener("click", recargar);
  addEventListener("online", recargar);
  // Con wifi pero sin internet el dispositivo dice que tiene conexión y no avisa cuando vuelve:
  // se prueba cada 5 segundos con un archivo pequeño de la app
  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    fetch("/icon.svg", { method: "HEAD", cache: "no-store" }).then((r) => r.ok && recargar(), () => {});
  }, 5000);
</script>
</body>
</html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      // La petición de la página sale mientras el service worker arranca: no agrega demora
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (evento) => {
  // Lo demás (datos de Next, acciones, archivos) va directo a la red, como sin service worker
  if (evento.request.mode !== "navigate") return;
  evento.respondWith(
    (async () => {
      try {
        return (await evento.preloadResponse) || (await fetch(evento.request));
      } catch {
        // Sin red: la página de arriba. Un error del servidor (5xx) sí llega tal cual a la app.
        return new Response(PAGINA_SIN_CONEXION, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
    })(),
  );
});
