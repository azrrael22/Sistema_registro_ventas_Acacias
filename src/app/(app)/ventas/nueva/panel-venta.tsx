"use client";

import { useEffect, useRef } from "react";
import { Aviso, Boton, Entrada, Etiqueta, Monto, cx } from "@/components/ui";
import { dinero } from "@/lib/formato";
import { textoBotonVenta, textoUnidades, type Linea, type Producto, type Resumen } from "./venta";

export type Mensaje = { error?: string; ok?: string } | undefined;

type Props = {
  resumen: Resumen;
  // Precio escrito en cada línea (texto, para poder borrarlo mientras se escribe)
  textoPrecio: (p: Producto) => string | number;
  nota: string;
  verDetalle: boolean;
  mensaje: Mensaje;
  enLinea: boolean;
  enviando: boolean;
  onPrecio: (p: Producto, texto: string) => void;
  onQuitar: (p: Producto) => void;
  onVaciar: () => void;
  onNota: (texto: string) => void;
  onDetalle: () => void;
  onRegistrar: () => void;
};

// El alto del tiquete, como variable CSS para su `top` en escritorio (ver el aside). Sin estado de
// React: cambia con cada producto y no hace falta volver a pintar nada
function useAltoTiquete() {
  const tiquete = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = tiquete.current;
    if (!aside) return;
    const observador = new ResizeObserver(() => aside.style.setProperty("--alto-tiquete", `${aside.offsetHeight}px`));
    observador.observe(aside);
    return () => observador.disconnect();
  }, []);
  return tiquete;
}

// La venta actual. En celular es una barra compacta sobre la navegación de abajo (en tablet, al
// fondo de la pantalla); en escritorio, un panel al lado con forma de tiquete (el contorno va en el
// aside y el zigzag en el div de adentro) que crece con cada producto, sin scroll propio. Mientras
// cabe en la ventana queda bajo el encabezado fijo (~101px); si no cabe, baja con la página y se
// pega cuando su borde de abajo llega al fondo, para que el total y «Registrar venta» sigan a la
// vista (el `top` sale del alto que mide el ResizeObserver; antes de medir vale 8rem)
export function PanelVenta(props: Props) {
  const { resumen, verDetalle, enLinea, enviando } = props;
  const tiquete = useAltoTiquete();
  return (
    <aside
      ref={tiquete}
      id="venta-actual"
      aria-label="Venta actual"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-stone-200 bg-white px-4 py-3 md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-stone-700 dark:bg-stone-900 lg:contorno-tiquete lg:sticky lg:inset-auto lg:top-[min(8rem,calc(100dvh_-_var(--alto-tiquete,0px)_-_1rem))] lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:px-6 lg:corte-tiquete lg:rounded-t-xl lg:bg-white lg:px-4 lg:pt-4 lg:pb-8 lg:dark:bg-stone-800">
        <h2 className="font-medium text-stone-900 max-lg:sr-only dark:text-stone-50">Venta actual</h2>
        <Detalle {...props} />
        {/* La confirmación queda junto al botón, donde se está mirando al registrar */}
        <Avisos mensaje={props.mensaje} enLinea={enLinea} unidades={resumen.unidades} />
        <Total resumen={resumen} verDetalle={verDetalle} onDetalle={props.onDetalle} />
        <Boton
          onClick={props.onRegistrar}
          disabled={!resumen.unidades || !resumen.preciosValidos || enviando || !enLinea}
          className="h-12 w-full text-base"
        >
          {textoBotonVenta({ enviando, unidades: resumen.unidades, preciosValidos: resumen.preciosValidos, enLinea })}
        </Boton>
      </div>
    </aside>
  );
}

// El detalle (líneas, precios y nota) se abre en celular con «Ver detalle» y la lista se desplaza
// dentro de la barra; en escritorio siempre está a la vista y entero
function Detalle({ resumen: { lineas }, textoPrecio, nota, verDetalle, onPrecio, onQuitar, onVaciar, onNota }: Props) {
  return (
    <div id="detalle-venta" className={cx("flex-col gap-3 lg:flex", verDetalle ? "flex" : "hidden")}>
      {lineas.length ? (
        // Se lee como el tiquete: «2 × Cold brew» y su monto, en la misma columna que el total.
        // -mx-3 px-3: el -mr-2 de «Quitar» y los contornos de foco caben sin scroll horizontal
        <ul className="-mx-3 flex max-h-[40vh] flex-col gap-3 overflow-y-auto px-3 py-1 lg:max-h-none lg:overflow-visible">
          {lineas.map((l) => (
            <LineaDetalle
              key={l.producto.id}
              linea={l}
              textoPrecio={textoPrecio(l.producto)}
              onPrecio={(texto) => onPrecio(l.producto, texto)}
              onQuitar={() => onQuitar(l.producto)}
            />
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-stone-500 dark:text-stone-400">Toca un producto para agregarlo</p>
      )}
      {/* La venta queda guardada al salir de la pantalla: aquí se descarta entera */}
      {lineas.length > 0 && (
        <div className="-mt-1 flex justify-end">
          <Boton variante="fantasma" className="-mr-2 min-h-8 px-2 text-xs text-stone-500 pointer-coarse:min-h-10" onClick={onVaciar}>
            Vaciar venta
          </Boton>
        </div>
      )}
      <Etiqueta texto="Nota (opcional)">
        <Entrada value={nota} onChange={(e) => onNota(e.target.value)} />
      </Etiqueta>
    </div>
  );
}

type PropsLinea = { linea: Linea; textoPrecio: string | number; onPrecio: (texto: string) => void; onQuitar: () => void };

function LineaDetalle({ linea: { producto: p, cantidad, precio }, textoPrecio, onPrecio, onQuitar }: PropsLinea) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="min-w-0 truncate text-stone-900 dark:text-stone-50">
          <span className="cifra">{cantidad}</span> × {p.nombre}
        </p>
        {precio === null ? (
          <span className="shrink-0 text-stone-500 dark:text-stone-400" aria-hidden>—</span>
        ) : (
          <Monto valor={precio * cantidad} className="shrink-0 text-stone-900 dark:text-stone-50" />
        )}
      </div>
      {/* Descuento: solo se puede bajar el precio, nunca subirlo */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <label htmlFor={`precio-${p.id}`} className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          Precio c/u
          <Entrada
            id={`precio-${p.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={p.precio}
            step={50}
            value={textoPrecio}
            onChange={(e) => onPrecio(e.target.value)}
            aria-invalid={precio === null}
            aria-describedby={precio === null ? `precio-${p.id}-error` : undefined}
            className={cx(
              "h-8 min-h-8 w-24 px-2 text-right cifra pointer-coarse:h-10 pointer-coarse:min-h-10",
              precio === null && "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500",
            )}
          />
        </label>
        <Boton
          variante="fantasma"
          className="-mr-2 min-h-8 shrink-0 px-2 text-xs text-stone-500 pointer-coarse:min-h-10"
          onClick={onQuitar}
          aria-label={`Quitar ${p.nombre} de la venta`}
        >
          Quitar
        </Boton>
      </div>
      {precio === null && (
        <p id={`precio-${p.id}-error`} className="mt-1 text-xs text-red-700 dark:text-red-400">
          Entre {dinero(0)} y {dinero(p.precio)}
        </p>
      )}
    </li>
  );
}

function Avisos({ mensaje, enLinea, unidades }: { mensaje: Mensaje; enLinea: boolean; unidades: number }) {
  return (
    <>
      {mensaje?.error && <Aviso>{mensaje.error}</Aviso>}
      {mensaje?.ok && <Aviso tipo="ok">{mensaje.ok}</Aviso>}
      {/* Sin conexión no se puede registrar; la venta no se pierde */}
      {!enLinea && unidades > 0 && !mensaje?.error && (
        <Aviso tipo="info">El carrito queda guardado en este celular: registra la venta cuando vuelva la conexión.</Aviso>
      )}
    </>
  );
}

// El total cierra la venta como en el tiquete: después de la línea punteada (en celular, solo con
// el detalle abierto; cerrado, la barra es una sola fila sobre el botón)
function Total({ resumen: { lineas, preciosValidos, total, descuento, unidades }, verDetalle, onDetalle }: Pick<Props, "resumen" | "verDetalle" | "onDetalle">) {
  return (
    <div
      className={cx(
        "lg:border-t lg:border-dashed lg:border-stone-300 lg:pt-2 lg:dark:border-stone-600",
        verDetalle && "border-t border-dashed border-stone-300 pt-2 dark:border-stone-600",
      )}
    >
      {descuento > 0 && (
        <p className="flex items-baseline justify-between text-sm text-stone-600 dark:text-stone-400">
          <span>Descuento</span>
          <Monto valor={-descuento} />
        </p>
      )}
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm text-stone-600 dark:text-stone-400">
          {unidades ? textoUnidades(unidades) : "Sin productos"}
          {lineas.length > 0 && preciosValidos && (
            <span className="lg:hidden">
              <span aria-hidden> · </span>
              {/* -my-3 py-3: el área táctil mide 44 px sin agrandar la barra */}
              <button
                type="button"
                onClick={onDetalle}
                aria-expanded={verDetalle}
                aria-controls="detalle-venta"
                className="-mx-1 -my-3 cursor-pointer rounded-md px-1 py-3 font-medium text-emerald-700 hover:underline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-emerald-400 dark:focus-visible:outline-emerald-500"
              >
                {verDetalle ? "Ocultar detalle" : "Ver detalle"}
              </button>
            </span>
          )}
        </p>
        <Monto valor={total} className="shrink-0 text-xl font-medium text-stone-900 dark:text-stone-50" />
      </div>
    </div>
  );
}
