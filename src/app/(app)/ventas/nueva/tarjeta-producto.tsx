"use client";

import { Monto, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { FotoProducto } from "@/components/foto-producto";
import { stockBajo, textoStock } from "@/lib/formato";
import { tope, type Producto } from "./venta";

// Botones − y + del control de cantidad (el contenedor recorta el fondo a su esquina)
const paso =
  "grid h-full w-10 shrink-0 cursor-pointer place-items-center text-stone-700 transition-colors enabled:hover:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-stone-300 pointer-coarse:w-11 dark:text-stone-300 dark:enabled:hover:bg-stone-700 dark:focus-visible:outline-emerald-500 dark:disabled:text-stone-600";

type Props = {
  producto: Producto;
  cantidad: number;
  // Precio que se cobra; null si el descuento escrito no es válido
  precio: number | null;
  // Fija la cantidad (la venta la ajusta al stock)
  onCantidad: (n: number) => void;
};

// Tarjeta de un producto en Vender. Tocarla suma una unidad; el precio y el stock se leen como
// descripción.
export function TarjetaProducto({ producto: p, cantidad, precio, onCantidad }: Props) {
  return (
    // rounded-2xl: 8 de la foto y del control de cantidad + 8 de relleno
    <li
      className={cx(
        "flex flex-col rounded-2xl border bg-white transition-colors dark:bg-stone-800",
        cantidad > 0 ? "border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500" : "border-stone-200 dark:border-stone-700",
        tope(p) <= 0 && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onCantidad(cantidad + 1)}
        disabled={cantidad >= tope(p)}
        aria-label={`Agregar 1 ${p.nombre}`}
        aria-describedby={`info-${p.id}`}
        className="flex flex-1 cursor-pointer flex-col rounded-t-2xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed dark:focus-visible:outline-emerald-500"
      >
        <FotoProducto src={p.foto} className="aspect-square h-auto w-full" />
        <span className="mt-2 block px-1 font-medium leading-snug text-stone-900 line-clamp-2 dark:text-stone-50">{p.nombre}</span>
        <span id={`info-${p.id}`} className="mt-auto block px-1 pt-1 text-sm">
          <PrecioProducto lista={p.precio} cobrado={precio} />
          {/* Sin inventario no hay stock que mostrar: al vendedor no le dice nada */}
          {p.stock !== null && <StockProducto stock={p.stock} />}
        </span>
      </button>
      <ControlCantidad producto={p} cantidad={cantidad} onCantidad={onCantidad} />
    </li>
  );
}

// Con descuento, el precio de lista va tachado antes del que se cobra
function PrecioProducto({ lista, cobrado }: { lista: number; cobrado: number | null }) {
  return (
    <>
      {cobrado !== null && cobrado < lista && (
        <>
          <s className="text-stone-500 dark:text-stone-400">
            <span className="sr-only">antes </span>
            <Monto valor={lista} />
          </s>{" "}
        </>
      )}
      <Monto valor={cobrado ?? lista} className="text-stone-900 dark:text-stone-50" />
    </>
  );
}

function StockProducto({ stock }: { stock: number }) {
  return (
    <span className={cx("cifra block text-xs", stockBajo(stock) ? "text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>
      {textoStock(stock)}
    </span>
  );
}

// Cantidad en un solo control: − n +. También se puede escribir; se ajusta al stock
function ControlCantidad({ producto: p, cantidad, onCantidad }: Omit<Props, "precio">) {
  return (
    <div className="px-2 pb-2">
      <div className="flex h-10 items-center overflow-hidden rounded-lg border border-stone-300 bg-white transition-colors focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 pointer-coarse:h-11 dark:border-stone-600 dark:bg-stone-800 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
        <button type="button" onClick={() => onCantidad(cantidad - 1)} disabled={cantidad === 0} aria-label={`Quitar 1 ${p.nombre}`} className={paso}>
          <IconoMenos />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={p.stock ?? undefined}
          step={1}
          value={cantidad}
          onChange={(e) => onCantidad(Math.trunc(Number(e.target.value)))}
          onFocus={(e) => e.target.select()}
          disabled={tope(p) <= 0}
          aria-label={`Cantidad de ${p.nombre}`}
          className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-medium text-stone-900 cifra focus:outline-none pointer-coarse:text-base dark:text-stone-50"
        />
        <button type="button" onClick={() => onCantidad(cantidad + 1)} disabled={cantidad >= tope(p)} aria-label={`Agregar 1 ${p.nombre}`} className={paso}>
          <IconoMas />
        </button>
      </div>
    </div>
  );
}
