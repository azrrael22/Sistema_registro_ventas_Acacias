"use client";

import { useMemo, useState, useTransition } from "react";
import { Aviso, Boton, Entrada, Monto, Vacio, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { FotoProducto } from "@/components/foto-producto";
import { dinero } from "@/lib/formato";
import { registrarVenta } from "../actions";

type Producto = { id: number; nombre: string; precio: number; foto: string | null; categoria: string; stock: number };

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
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtrados.map((p) => {
              const cant = cantidades[p.id] ?? 0;
              const agotado = p.stock <= 0;
              const precio = precioDe(p);
              return (
                <li
                  key={p.id}
                  className={cx(
                    "flex flex-col rounded-xl border bg-white transition-colors dark:bg-stone-800",
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
                    className="flex flex-1 cursor-pointer flex-col rounded-t-xl p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed dark:focus-visible:outline-emerald-500"
                  >
                    <span className="relative block">
                      <FotoProducto src={p.foto} className="aspect-square h-auto w-full" />
                      {cant > 0 && (
                        <span aria-hidden className="absolute top-1.5 right-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-emerald-700 px-1.5 text-xs font-medium text-white tabular-nums shadow-sm dark:bg-emerald-600">
                          {cant}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block px-1 text-xs text-stone-500 dark:text-stone-400">{p.categoria}</span>
                    <span className="block px-1 font-medium leading-snug text-stone-900 line-clamp-2 dark:text-stone-50">{p.nombre}</span>
                    <span className="mt-auto block px-1 pt-1 text-sm text-stone-600 dark:text-stone-400">
                      {precio !== null && precio < p.precio && (
                        <>
                          <s className="text-stone-400 dark:text-stone-500">
                            <span className="sr-only">antes </span>
                            <Monto valor={p.precio} />
                          </s>{" "}
                        </>
                      )}
                      <Monto valor={precio ?? p.precio} className="text-stone-900 dark:text-stone-50" />
                      <span className={cx("block text-xs", p.stock <= 3 && "text-amber-700 dark:text-amber-400")}>
                        {agotado ? "Agotado" : `${p.stock} disponibles`}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-center justify-between gap-2 border-t border-stone-100 p-2 dark:border-stone-700">
                    <Boton variante="secundario" className="size-10 px-0" onClick={() => cambiar(p, -1)} disabled={cant === 0} aria-label={`Quitar un ${p.nombre}`}>
                      <IconoMenos />
                    </Boton>
                    {/* También se puede escribir la cantidad; se ajusta al stock disponible */}
                    <Entrada
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
                      className="min-w-0 flex-1 px-1 text-center font-medium tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <Boton variante="secundario" className="size-10 px-0" onClick={() => cambiar(p, 1)} disabled={cant >= p.stock} aria-label={`Agregar un ${p.nombre}`}>
                      <IconoMas />
                    </Boton>
                  </div>
                </li>
              );
            })}
          </ul>
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
              <ul className="max-h-[45vh] divide-y divide-stone-100 overflow-y-auto lg:max-h-[50vh] dark:divide-stone-700">
                {items.map((p) => {
                  const cant = cantidades[p.id];
                  const precio = precioDe(p);
                  return (
                    <li key={p.id} className="py-3 first:pt-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                          {p.nombre} <span className="font-normal text-stone-500 tabular-nums dark:text-stone-400">× {cant}</span>
                        </p>
                        <Boton variante="fantasma" className="min-h-8 shrink-0 px-2 text-stone-500" onClick={() => cambiar(p, -cant)} aria-label={`Quitar ${p.nombre} de la venta`}>
                          Quitar
                        </Boton>
                      </div>
                      {/* Descuento: solo se puede bajar el precio, nunca subirlo */}
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <label htmlFor={`precio-${p.id}`} className="text-sm text-stone-600 dark:text-stone-400">
                          Precio unitario
                          {precio === null ? (
                            <span id={`precio-${p.id}-error`} className="block text-xs text-red-700 dark:text-red-400">
                              Entre $0 y {dinero(p.precio)}
                            </span>
                          ) : (
                            <span className="block text-xs">
                              Subtotal <Monto valor={precio * cant} />
                            </span>
                          )}
                        </label>
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
                            "w-28 text-right font-mono tabular-nums",
                            precio === null && "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500",
                          )}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-2 text-sm text-stone-500 dark:text-stone-400">Toca un producto para agregarlo.</p>
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
