"use client";

import { useMemo, useState, useTransition } from "react";
import { Aviso, Boton, Entrada, Monto, Vacio, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { FotoProducto } from "@/components/foto-producto";
import { dinero } from "@/lib/formato";
import { registrarVenta } from "../actions";

type Producto = { id: number; nombre: string; precio: number; foto: string | null; categoria: string; stock: number };

// Botones − y + del control de cantidad (el contenedor recorta el fondo a su esquina)
const paso =
  "grid h-full w-10 shrink-0 cursor-pointer place-items-center text-stone-700 transition-colors enabled:hover:bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:text-stone-300 dark:text-stone-300 dark:enabled:hover:bg-stone-700 dark:focus-visible:outline-emerald-500 dark:disabled:text-stone-600";

// Filtro por categoría: mismo aspecto que Pestanas, pero con botones porque es estado del cliente
function Chips({ opciones, activa, onCambiar }: { opciones: string[]; activa: string | null; onCambiar: (c: string | null) => void }) {
  return (
    <div role="group" aria-label="Filtrar por categoría" className="mt-3 overflow-x-auto">
      <ul className="inline-flex gap-1 rounded-lg bg-stone-100 p-1 text-sm whitespace-nowrap dark:bg-stone-800">
        {[null, ...opciones].map((c) => (
          <li key={c ?? ""}>
            <button
              type="button"
              aria-pressed={activa === c}
              onClick={() => onCambiar(c)}
              className={cx(
                "block cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 dark:focus-visible:outline-emerald-500",
                activa === c ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-stone-50 dark:shadow-none" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-50",
              )}
            >
              {c ?? "Todos"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Carrito({ productos }: { productos: Producto[] }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  // Precio escrito por quien vende (descuento), como texto para poder borrarlo mientras escribe
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [detalle, setDetalle] = useState(false);
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState<{ error?: string; ok?: string }>();
  const [enviando, startTransition] = useTransition();

  const fijar = (p: Producto, n: number) => {
    setMensaje(undefined);
    const cant = Math.max(0, Math.min(p.stock, n || 0));
    setCantidades((c) => ({ ...c, [p.id]: cant }));
    // Si sale del carrito, vuelve a su precio de lista
    if (!cant) setPrecios((pr) => { const resto = { ...pr }; delete resto[p.id]; return resto; });
  };
  const cambiar = (p: Producto, delta: number) => fijar(p, (cantidades[p.id] ?? 0) + delta);

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

  const items = productos.filter((p) => cantidades[p.id] > 0);
  const preciosValidos = items.every((p) => precioDe(p) !== null);
  const total = items.reduce((t, p) => t + (precioDe(p) ?? p.precio) * cantidades[p.id], 0);
  const descuento = items.reduce((t, p) => t + (p.precio - (precioDe(p) ?? p.precio)) * cantidades[p.id], 0);
  const unidades = items.reduce((t, p) => t + cantidades[p.id], 0);
  // Un precio inválido abre el detalle para que se vea dónde corregirlo
  const verDetalle = detalle || !preciosValidos;

  const confirmar = () =>
    startTransition(async () => {
      const r = await registrarVenta(
        items.map((p) => {
          const precio = precioDe(p) ?? p.precio;
          return { producto_id: p.id, cantidad: cantidades[p.id], precio_unitario: precio < p.precio ? precio : undefined };
        }),
        nota,
      );
      setMensaje(r);
      if (r?.ok) {
        setCantidades({});
        setPrecios({});
        setNota("");
        setDetalle(false);
      }
    });

  return (
    <div className="pb-60 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6 lg:pb-0">
      <div className="min-w-0">
        <Entrada
          type="search"
          placeholder="Buscar producto"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar producto"
        />
        {categorias.length > 1 && <Chips opciones={categorias} activa={categoria} onCambiar={setCategoria} />}
        {mensaje?.ok && <div className="mt-4"><Aviso tipo="ok">{mensaje.ok}</Aviso></div>}

        {filtrados.length ? (
          <div className="mt-4 flex flex-col gap-6">
            {grupos.map(([cat, lista]) => (
              <div key={cat}>
                {/* Con una categoría elegida en el filtro, el encabezado sobra */}
                {cat && !categoria && <h2 className="mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">{cat}</h2>}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {lista.map((p) => {
                    const cant = cantidades[p.id] ?? 0;
                    const agotado = p.stock <= 0;
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
                        {/* Tocar el producto suma una unidad */}
                        <button
                          type="button"
                          onClick={() => cambiar(p, 1)}
                          disabled={cant >= p.stock}
                          aria-label={`Agregar un ${p.nombre}`}
                          className="flex flex-1 cursor-pointer flex-col rounded-t-2xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed dark:focus-visible:outline-emerald-500"
                        >
                          <FotoProducto src={p.foto} className="aspect-square h-auto w-full" />
                          <span className="mt-2 block px-1 font-medium leading-snug text-stone-900 line-clamp-2 dark:text-stone-50">{p.nombre}</span>
                          <span className="mt-auto block px-1 pt-1 text-sm">
                            {precio !== null && precio < p.precio && (
                              <>
                                <s className="text-stone-500 dark:text-stone-400">
                                  <span className="sr-only">antes </span>
                                  <Monto valor={p.precio} />
                                </s>{" "}
                              </>
                            )}
                            <Monto valor={precio ?? p.precio} className="text-stone-900 dark:text-stone-50" />
                            <span className={cx("block text-xs", p.stock <= 3 ? "text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>
                              {agotado ? "Agotado" : `${p.stock} en stock`}
                            </span>
                          </span>
                        </button>

                        {/* Cantidad en un solo control: − n +. También se puede escribir; se ajusta al stock */}
                        <div className="px-2 pb-2">
                          <div className="flex h-10 items-center overflow-hidden rounded-lg border border-stone-300 bg-white transition-colors focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 dark:border-stone-600 dark:bg-stone-800 dark:focus-within:border-emerald-500 dark:focus-within:ring-emerald-500/20">
                            <button
                              type="button"
                              onClick={() => cambiar(p, -1)}
                              disabled={cant === 0}
                              aria-label={`Quitar un ${p.nombre}`}
                              className={paso}
                            >
                              <IconoMenos />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={p.stock}
                              step={1}
                              value={cant}
                              onChange={(e) => fijar(p, Math.trunc(Number(e.target.value)))}
                              onFocus={(e) => e.target.select()}
                              disabled={agotado}
                              aria-label={`Cantidad de ${p.nombre}`}
                              className="h-full min-w-0 flex-1 bg-transparent text-center text-sm font-medium text-stone-900 tabular-nums focus:outline-none dark:text-stone-50"
                            />
                            <button
                              type="button"
                              onClick={() => cambiar(p, 1)}
                              disabled={cant >= p.stock}
                              aria-label={`Agregar un ${p.nombre}`}
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
          <div className="mt-4"><Vacio>Sin resultados</Vacio></div>
        )}
      </div>

      {/* En celular es la barra fija de abajo; en escritorio, un panel al lado */}
      <aside
        aria-label="Venta actual"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)] lg:sticky lg:inset-auto lg:top-6 lg:z-auto lg:rounded-xl lg:border lg:bg-white lg:p-4 lg:shadow-sm lg:dark:bg-stone-800 lg:dark:shadow-none"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:px-6 lg:px-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-stone-900 dark:text-stone-50">Venta actual</h2>
            {items.length > 0 && preciosValidos && (
              <Boton variante="fantasma" className="min-h-8 px-2 lg:hidden" onClick={() => setDetalle((d) => !d)} aria-expanded={verDetalle} aria-controls="detalle-venta">
                {verDetalle ? "Ocultar" : "Ver detalle"}
              </Boton>
            )}
          </div>

          <div id="detalle-venta" className={cx(!verDetalle && "hidden", "lg:block")}>
            {items.length ? (
              // Se lee como el tiquete: «2 × Cold brew» y su monto, en la misma columna que el total
              <ul className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto py-1 lg:max-h-[50vh]">
                {items.map((p) => {
                  const cant = cantidades[p.id];
                  const precio = precioDe(p);
                  return (
                    <li key={p.id}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <p className="min-w-0 truncate text-stone-900 dark:text-stone-50">
                          <span className="tabular-nums">{cant}</span> × {p.nombre}
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
                              setMensaje(undefined);
                              setPrecios((pr) => ({ ...pr, [p.id]: e.target.value }));
                            }}
                            aria-invalid={precio === null}
                            aria-describedby={precio === null ? `precio-${p.id}-error` : undefined}
                            className={cx(
                              "h-8 min-h-8 w-24 px-2 text-right font-mono tabular-nums",
                              precio === null && "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500",
                            )}
                          />
                        </label>
                        <Boton variante="fantasma" className="-mr-2 min-h-8 shrink-0 px-2 text-xs text-stone-500" onClick={() => cambiar(p, -cant)} aria-label={`Quitar ${p.nombre} de la venta`}>
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
          </div>

          {mensaje?.error && <Aviso>{mensaje.error}</Aviso>}
          <Entrada placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />
          {/* El total cierra la venta como en el tiquete: después de la línea punteada */}
          <div className="border-t border-dashed border-stone-300 pt-2 dark:border-stone-600">
            {descuento > 0 && (
              <p className="flex items-baseline justify-between text-sm text-stone-600 dark:text-stone-400">
                <span>Descuento</span>
                <Monto valor={-descuento} />
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-600 dark:text-stone-400">{unidades ? `${unidades} ${unidades === 1 ? "unidad" : "unidades"}` : "Sin productos"}</span>
              <Monto valor={total} className="text-xl font-medium text-stone-900 dark:text-stone-50" />
            </div>
          </div>
          <Boton onClick={confirmar} disabled={!unidades || !preciosValidos || enviando} className="h-12 w-full text-base">
            {enviando ? "Registrando…" : !unidades ? "Selecciona productos" : preciosValidos ? "Registrar venta" : "Revisa los precios"}
          </Boton>
        </div>
      </aside>
    </div>
  );
}
