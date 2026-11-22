import { Marca } from "@/components/marca";
import { dinero, fecha } from "@/lib/formato";

// Venta de muestra para la pantalla de ingreso: así queda una venta registrada.
const items = [
  { cantidad: 2, nombre: "Alfajor", precio: 7000 },
  { cantidad: 1, nombre: "Cold brew", precio: 12000 },
  { cantidad: 1, nombre: "Pin", precio: 18000 },
];
const total = items.reduce((t, i) => t + i.cantidad * i.precio, 0);

// El borde de abajo se corta en zigzag, como un tiquete arrancado del rollo.
const cortado = "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) 50% / 12px 100%";

export function TicketVenta() {
  return (
    <figure className="-rotate-2 drop-shadow-[0_12px_20px_rgb(28_25_23/0.10)] motion-safe:animate-aparecer" aria-label="Ejemplo de una venta registrada">
      <div className="w-88 rounded-t-md bg-white px-7 pt-7 pb-11 font-mono text-sm text-stone-700" style={{ mask: cortado }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-stone-900">
            <Marca className="size-5" /> Las Acacias
          </span>
          <span className="text-xs text-stone-500">Venta #148</span>
        </div>
        <div className="mt-4 text-xs leading-5 text-stone-500">
          <p>{fecha("2026-11-12T20:40:00Z")}</p>
          <p>Valentina Ruiz</p>
        </div>

        <ul className="mt-5 flex flex-col gap-3 border-t border-dashed border-stone-300 pt-5 tabular-nums">
          {items.map((i) => (
            <li key={i.nombre} className="flex justify-between gap-4">
              <span>
                {i.cantidad} × {i.nombre}
              </span>
              <span>{dinero(i.cantidad * i.precio)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-baseline justify-between border-t border-dashed border-stone-300 pt-5">
          <span>Total</span>
          <span className="text-2xl font-medium text-stone-900 tabular-nums">{dinero(total)}</span>
        </div>
      </div>
    </figure>
  );
}
