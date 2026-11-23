"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Aviso, Boton, Entrada, Etiqueta, Monto, Vacio, claseSegmento, claseSegmentos, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { FotoProducto } from "@/components/foto-producto";
import { useEnLinea } from "@/components/sin-conexion";
import { dinero, stockBajo, textoStock } from "@/lib/formato";
import { mensajeFalloVenta } from "@/lib/errores";
import { registrarVenta } from "../actions";
import { VENTA_VACIA, useVentaGuardada } from "./venta-guardada";

// stock null: el producto no lleva inventario y se vende sin tope
type Producto = { id: number; nombre: string; precio: number; foto: string | null; categoria: string; stock: number | null };

// Cuántas unidades se pueden vender como máximo
const tope = (p: Producto) => p.stock ?? Infinity;

// Copia sin la entrada de un producto
function sin<T>(registro: Record<number, T>, id: number) {
  const copia = { ...registro };
  delete copia[id];
  return copia;
}

// Botones − y + del control de cantidad (el contenedor recorta el fondo a su esquina)
const paso =
  "grid h-full w-10 shrink-0 cursor-pointer place-items-center text-stone-700 transition-colors enabled:hover:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-stone-300 pointer-coarse:w-11 dark:text-stone-300 dark:enabled:hover:bg-stone-700 dark:focus-visible:outline-emerald-500 dark:disabled:text-stone-600";

const unidadesTexto = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;

// Filtro por categoría: mismo aspecto que Pestanas, pero con botones porque es estado del cliente
function Chips({ opciones, activa, onCambiar }: { opciones: string[]; activa: string | null; onCambiar: (c: string | null) => void }) {
  return (
    <div role="group" aria-label="Filtrar por categoría" className="mt-3">
      <ul className={claseSegmentos}>
        {[null, ...opciones].map((c) => (
          <li key={c ?? ""}>
            <button type="button" aria-pressed={activa === c} onClick={() => onCambiar(c)} className={cx("cursor-pointer", claseSegmento(activa === c))}>
              {c ?? "Todos"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Carrito({ productos, empleadoId }: { productos: Producto[]; empleadoId: string }) {
  // Cantidades, precios con descuento (como texto, para poder borrarlo mientras se escribe) y nota:
  // quedan guardados en el celular hasta registrar la venta o vaciarla (ver venta-guardada.ts)
  const [venta, cambiarVenta] = useVentaGuardada(`acacias:venta:${empleadoId}`);
  const { cantidades, precios, nota } = venta;
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [detalle, setDetalle] = useState(false);
  const [mensaje, setMensaje] = useState<{ error?: string; ok?: string }>();
  const [enviando, startTransition] = useTransition();
  const enLinea = useEnLinea();

  // El alto del tiquete, como variable CSS para su `top` en escritorio (ver el aside). Sin estado de
  // React: cambia con cada producto y no hace falta volver a pintar nada
  const tiquete = useRef<HTMLElement>(null);
  useEffect(() => {
    const aside = tiquete.current;
    if (!aside) return;
    const observador = new ResizeObserver(() => aside.style.setProperty("--alto-tiquete", `${aside.offsetHeight}px`));
    observador.observe(aside);
    return () => observador.disconnect();
  }, []);

  // Una venta guardada pudo quedar con más unidades de las que hay ahora: cuenta hasta el stock
  const cantidadDe = (p: Producto) => Math.min(cantidades[p.id] ?? 0, Math.max(0, tope(p)));

  const fijar = (p: Producto, n: number) => {
    setMensaje(undefined);
    const cant = Math.max(0, Math.min(tope(p), n || 0));
    // Si sale del carrito, vuelve a su precio de lista
    cambiarVenta((v) =>
      cant ? { ...v, cantidades: { ...v.cantidades, [p.id]: cant } } : { ...v, cantidades: sin(v.cantidades, p.id), precios: sin(v.precios, p.id) },
    );
  };
  const cambiar = (p: Producto, delta: number) => fijar(p, cantidadDe(p) + delta);

  const vaciar = () => {
    setMensaje(undefined);
    setDetalle(false);
    cambiarVenta(() => VENTA_VACIA);
  };

  // Precio que se cobra: el de lista o uno menor. null si lo escrito no es válido.
  const precioDe = (p: Producto) => {
    const texto = precios[p.id];
    if (texto === undefined) return p.precio;
    const n = Number(texto);
    return texto.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= p.precio ? n : null;
  };

  // Ya vienen ordenados por categoría desde el servidor
  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter(Boolean))], [productos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => (!categoria || p.categoria === categoria) && (!q || `${p.nombre} ${p.categoria}`.toLowerCase().includes(q)),
    );
  }, [busqueda, categoria, productos]);

  // Una cuadrícula por categoría, en el orden en que llegan
  const grupos = useMemo(() => {
    const porCategoria = new Map<string, Producto[]>();
    for (const p of filtrados) {
      const lista = porCategoria.get(p.categoria);
      if (lista) lista.push(p);
      else porCategoria.set(p.categoria, [p]);
    }
    return [...porCategoria];
  }, [filtrados]);

  // Los productos que ya no existen o se desactivaron no aparecen aunque sigan en la venta guardada
  const items = productos.filter((p) => cantidadDe(p) > 0);
  const preciosValidos = items.every((p) => precioDe(p) !== null);
  const total = items.reduce((t, p) => t + (precioDe(p) ?? p.precio) * cantidadDe(p), 0);
  const descuento = items.reduce((t, p) => t + (p.precio - (precioDe(p) ?? p.precio)) * cantidadDe(p), 0);
  const unidades = items.reduce((t, p) => t + cantidadDe(p), 0);
  // Un precio inválido abre el detalle para que se vea dónde corregirlo
  const verDetalle = detalle || !preciosValidos;

  const confirmar = () => {
    // Lo que se vendió, para confirmarlo después de vaciar el carrito
    const resumen = `${unidadesTexto(unidades)} · ${dinero(total)}`;
    startTransition(async () => {
      let r;
      try {
        r = await registrarVenta(
          items.map((p) => {
            const precio = precioDe(p) ?? p.precio;
            return { producto_id: p.id, cantidad: cantidadDe(p), precio_unitario: precio < p.precio ? precio : undefined };
          }),
          nota,
        );
      } catch (e) {
        // Las redirecciones (cuenta desactivada, sesión vencida) siguen su curso
        unstable_rethrow(e);
        // Sin internet, se cortó la conexión o el servidor falló: el carrito se queda como está y
        // se dice si la venta pudo quedar registrada (para no registrarla dos veces)
        setMensaje({ error: mensajeFalloVenta(e) });
        return;
      }
      setMensaje(r?.ok ? { ok: `${r.ok} · ${resumen}` } : r);
      if (r?.ok) {
        // Registrada: se borra también del celular
        cambiarVenta(() => VENTA_VACIA);
        setDetalle(false);
      }
    });
  };

  return (
    // pb-32: en celular y tablet, el final de la lista queda por encima de la barra de la venta
    <div className="pb-32 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6 lg:pb-0">
      <div className="min-w-0">
        <Entrada
          type="search"
          placeholder="Buscar producto"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar producto"
        />
        {categorias.length > 1 && <Chips opciones={categorias} activa={categoria} onCambiar={setCategoria} />}

        {filtrados.length ? (
          <div className="mt-4 flex flex-col gap-6">
            {grupos.map(([cat, lista]) => (
              <div key={cat}>
                {/* Con una categoría elegida en el filtro, el encabezado sobra */}
                {cat && !categoria && <h2 className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">{cat}</h2>}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {lista.map((p) => {
                    const cant = cantidadDe(p);
                    const agotado = tope(p) <= 0;
                    const precio = precioDe(p);
                    return (
                      // rounded-2xl: 8 de la foto y del control de cantidad + 8 de relleno
                      <li
                        key={p.id}
                        className={cx(
                          "flex flex-col rounded-2xl border bg-white transition-colors dark:bg-stone-800",
                          cant > 0 ? "border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500" : "border-stone-200 dark:border-stone-700",
                          agotado && "opacity-50",
                        )}
                      >
                        {/* Tocar el producto suma una unidad. El precio y el stock se leen como descripción */}
                        <button
                          type="button"
                          onClick={() => cambiar(p, 1)}
                          disabled={cant >= tope(p)}
                          aria-label={`Agregar 1 ${p.nombre}`}
                          aria-describedby={`info-${p.id}`}
                          className="flex flex-1 cursor-pointer flex-col rounded-t-2xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed dark:focus-visible:outline-emerald-500"
                        >
                          <FotoProducto src={p.foto} className="aspect-square h-auto w-full" />
                          <span className="mt-2 block px-1 font-medium leading-snug text-stone-900 line-clamp-2 dark:text-stone-50">{p.nombre}</span>
                          <span id={`info-${p.id}`} className="mt-auto block px-1 pt-1 text-sm">
                            {precio !== null && precio < p.precio && (
                              <>
                                <s className="text-stone-500 dark:text-stone-400">
                                  <span className="sr-only">antes </span>
                                  <Monto valor={p.precio} />
                                </s>{" "}
                              </>
                            )}
                            <Monto valor={precio ?? p.precio} className="text-stone-900 dark:text-stone-50" />
                            {/* Sin inventario no hay stock que mostrar: al vendedor no le dice nada */}
                            {p.stock !== null && (
                              <span className={cx("cifra block text-xs", stockBajo(p.stock) ? "text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>
                                {textoStock(p.stock)}
                              </span>
                            )}
                          </span>
                        </button>

                        {/* Cantidad en un solo control: − n +. También se puede escribir; se ajusta al stock */}
                        <div className="px-2 pb-2">
                          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-stone-300 bg-white transition-colors focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 pointer-coarse:h-11 dark:border-stone-600 dark:bg-stone-800 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
                            <button
                              type="button"
                              onClick={() => cambiar(p, -1)}
                              disabled={cant === 0}
                              aria-label={`Quitar 1 ${p.nombre}`}
                              className={paso}
                            >
                              <IconoMenos />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={p.stock ?? undefined}
                              step={1}
                              value={cant}
                              onChange={(e) => fijar(p, Math.trunc(Number(e.target.value)))}
                              onFocus={(e) => e.target.select()}
                              disabled={agotado}
                              aria-label={`Cantidad de ${p.nombre}`}
                              className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-medium text-stone-900 cifra focus:outline-none pointer-coarse:text-base dark:text-stone-50"
                            />
                            <button
                              type="button"
                              onClick={() => cambiar(p, 1)}
                              disabled={cant >= tope(p)}
                              aria-label={`Agregar 1 ${p.nombre}`}
                              className={paso}
                            >
                              <IconoMas />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <Vacio>
              Ningún producto coincide con la búsqueda
              <span className="mt-3 block">
                <Boton
                  variante="secundario"
                  onClick={() => {
                    setBusqueda("");
                    setCategoria(null);
                  }}
                >
                  Limpiar búsqueda
                </Boton>
              </span>
            </Vacio>
          </div>
        )}
      </div>

      {/* En celular es una barra compacta sobre la navegación de abajo (en tablet, al fondo de la
          pantalla); en escritorio, un panel al lado con forma de tiquete (el contorno va en el aside y
          el zigzag en el div de adentro) que crece con cada producto, sin scroll propio. Mientras cabe
          en la ventana queda bajo el encabezado fijo (~101px); si no cabe, baja con la página y se pega
          cuando su borde de abajo llega al fondo, para que el total y «Registrar venta» sigan a la vista
          (el `top` sale del alto que mide el ResizeObserver; antes de medir vale 8rem) */}
      <aside
        ref={tiquete}
        id="venta-actual"
        aria-label="Venta actual"
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-stone-200 bg-white px-4 py-3 md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-stone-700 dark:bg-stone-900 lg:contorno-tiquete lg:sticky lg:inset-auto lg:top-[min(8rem,calc(100dvh_-_var(--alto-tiquete,0px)_-_1rem))] lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:dark:bg-transparent"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:px-6 lg:corte-tiquete lg:rounded-t-xl lg:bg-white lg:px-4 lg:pt-4 lg:pb-8 lg:dark:bg-stone-800">
          <h2 className="font-medium text-stone-900 max-lg:sr-only dark:text-stone-50">Venta actual</h2>

          {/* El detalle (líneas, precios y nota) se abre en celular con «Ver detalle» y la lista se
              desplaza dentro de la barra; en escritorio siempre está a la vista y entero */}
          <div id="detalle-venta" className={cx("flex-col gap-3 lg:flex", verDetalle ? "flex" : "hidden")}>
            {items.length ? (
              // Se lee como el tiquete: «2 × Cold brew» y su monto, en la misma columna que el total.
              // -mx-3 px-3: el -mr-2 de «Quitar» y los contornos de foco caben sin scroll horizontal
              <ul className="-mx-3 flex max-h-[40vh] flex-col gap-3 overflow-y-auto px-3 py-1 lg:max-h-none lg:overflow-visible">
                {items.map((p) => {
                  const cant = cantidadDe(p);
                  const precio = precioDe(p);
                  return (
                    <li key={p.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <p className="min-w-0 truncate text-stone-900 dark:text-stone-50">
                          <span className="cifra">{cant}</span> × {p.nombre}
                        </p>
                        {precio === null ? (
                          <span className="shrink-0 text-stone-500 dark:text-stone-400" aria-hidden>—</span>
                        ) : (
                          <Monto valor={precio * cant} className="shrink-0 text-stone-900 dark:text-stone-50" />
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
                            value={precios[p.id] ?? p.precio}
                            onChange={(e) => {
                              const texto = e.target.value;
                              setMensaje(undefined);
                              cambiarVenta((v) => ({ ...v, precios: { ...v.precios, [p.id]: texto } }));
                            }}
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
                          onClick={() => cambiar(p, -cant)}
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
                })}
              </ul>
            ) : (
              <p className="py-2 text-sm text-stone-500 dark:text-stone-400">Toca un producto para agregarlo</p>
            )}
            {/* La venta queda guardada al salir de la pantalla: aquí se descarta entera */}
            {items.length > 0 && (
              <div className="-mt-1 flex justify-end">
                <Boton variante="fantasma" className="-mr-2 min-h-8 px-2 text-xs text-stone-500 pointer-coarse:min-h-10" onClick={vaciar}>
                  Vaciar venta
                </Boton>
              </div>
            )}
            <Etiqueta texto="Nota (opcional)">
              <Entrada
                value={nota}
                onChange={(e) => {
                  const texto = e.target.value;
                  cambiarVenta((v) => ({ ...v, nota: texto }));
                }}
              />
            </Etiqueta>
          </div>

          {/* La confirmación queda junto al botón, donde se está mirando al registrar */}
          {mensaje?.error && <Aviso>{mensaje.error}</Aviso>}
          {mensaje?.ok && <Aviso tipo="ok">{mensaje.ok}</Aviso>}
          {/* Sin conexión no se puede registrar; la venta no se pierde */}
          {!enLinea && unidades > 0 && !mensaje?.error && (
            <Aviso tipo="info">El carrito queda guardado en este celular: registra la venta cuando vuelva la conexión.</Aviso>
          )}

          {/* El total cierra la venta como en el tiquete: después de la línea punteada (en celular,
              solo con el detalle abierto; cerrado, la barra es una sola fila sobre el botón) */}
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
                {unidades ? unidadesTexto(unidades) : "Sin productos"}
                {items.length > 0 && preciosValidos && (
                  <span className="lg:hidden">
                    <span aria-hidden> · </span>
                    {/* -my-3 py-3: el área táctil mide 44 px sin agrandar la barra */}
                    <button
                      type="button"
                      onClick={() => setDetalle((d) => !d)}
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
          <Boton onClick={confirmar} disabled={!unidades || !preciosValidos || enviando || !enLinea} className="h-12 w-full text-base">
            {enviando
              ? "Registrando…"
              : !unidades
                ? "Selecciona productos"
                : !preciosValidos
                  ? "Revisa los precios"
                  : enLinea
                    ? "Registrar venta"
                    : "Sin conexión"}
          </Boton>
        </div>
      </aside>
    </div>
  );
}
