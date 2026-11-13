"use client";

import { useMemo, useState, useTransition } from "react";
import { Aviso, Boton, Entrada, Monto, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { FotoProducto } from "@/components/foto-producto";
import { dinero } from "@/lib/formato";
import { registrarVenta } from "../actions";

type Producto = { id: number; nombre: string; precio: number; foto: string | null; categoria: string; stock: number };

export function Carrito({ productos }: { productos: Producto[] }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  // Precio escrito por quien vende (descuento), como texto para poder borrarlo mientras escribe
  const [precios, setPrecios] = useState<Record<number, string>>({});
  const [busqueda, setBusqueda] = useState("");
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState<{ error?: string; ok?: string }>();
  const [enviando, startTransition] = useTransition();

  const cambiar = (p: Producto, delta: number) => {
    setMensaje(undefined);
    const cant = Math.max(0, Math.min(p.stock, (cantidades[p.id] ?? 0) + delta));
    setCantidades((c) => ({ ...c, [p.id]: cant }));
    // Si sale del carrito, vuelve a su precio de lista
    if (!cant) setPrecios((pr) => { const resto = { ...pr }; delete resto[p.id]; return resto; });
  };

  // Precio que se cobra: el de lista o uno menor. null si lo escrito no es válido.
  const precioDe = (p: Producto) => {
    const texto = precios[p.id];
    if (texto === undefined) return p.precio;
    const n = Number(texto);
    return texto.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= p.precio ? n : null;
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? productos.filter((p) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(q)) : productos;
  }, [busqueda, productos]);

  const items = productos.filter((p) => cantidades[p.id] > 0);
  const preciosValidos = items.every((p) => precioDe(p) !== null);
  const total = items.reduce((t, p) => t + (precioDe(p) ?? p.precio) * cantidades[p.id], 0);
  const descuento = items.reduce((t, p) => t + (p.precio - (precioDe(p) ?? p.precio)) * cantidades[p.id], 0);
  const unidades = items.reduce((t, p) => t + cantidades[p.id], 0);

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
      }
    });

  return (
    <div className="pb-48">
      <Entrada
        type="search"
        placeholder="Buscar producto"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar producto"
      />
      {mensaje?.ok && <div className="mt-4"><Aviso tipo="ok">{mensaje.ok}</Aviso></div>}

      <ul className="flex flex-col gap-2">
        {filtrados.map((p, i) => {
          const encabezado = p.categoria !== filtrados[i - 1]?.categoria ? p.categoria : null;
          const cant = cantidades[p.id] ?? 0;
          const agotado = p.stock <= 0;
          const precio = precioDe(p);
          return (
            <li key={p.id}>
              {encabezado && <h2 className="mt-6 mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">{encabezado}</h2>}
              <div
                className={cx(
                  "rounded-xl border bg-white p-3 transition-colors dark:bg-stone-800",
                  cant > 0 ? "border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500" : "border-stone-200 dark:border-stone-700",
                  agotado && "opacity-50",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FotoProducto src={p.foto} className="size-12" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900 dark:text-stone-50">{p.nombre}</p>
                      <p className="text-sm text-stone-600 dark:text-stone-400">
                        {precio !== null && precio < p.precio && (
                          <>
                            <s className="text-stone-400 dark:text-stone-500">
                              <span className="sr-only">antes </span>
                              <Monto valor={p.precio} />
                            </s>{" "}
                          </>
                        )}
                        <Monto valor={precio ?? p.precio} /> ·{" "}
                        <span className={p.stock <= 3 ? "text-amber-700 dark:text-amber-400" : ""}>{agotado ? "Agotado" : `${p.stock} disponibles`}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Boton variante="secundario" className="size-10 px-0" onClick={() => cambiar(p, -1)} disabled={cant === 0} aria-label={`Quitar un ${p.nombre}`}>
                      <IconoMenos />
                    </Boton>
                    <span className="w-6 text-center font-medium tabular-nums" aria-live="polite">{cant}</span>
                    <Boton variante="secundario" className="size-10 px-0" onClick={() => cambiar(p, 1)} disabled={cant >= p.stock} aria-label={`Agregar un ${p.nombre}`}>
                      <IconoMas />
                    </Boton>
                  </div>
                </div>
                {/* Descuento: solo se puede bajar el precio, nunca subirlo */}
                {cant > 0 && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-stone-300 pt-3 dark:border-stone-600">
                    <label htmlFor={`precio-${p.id}`} className="text-sm text-stone-600 dark:text-stone-400">
                      Precio unitario
                      {precio === null && (
                        <span id={`precio-${p.id}-error`} className="block text-xs text-red-700 dark:text-red-400">
                          Entre $0 y {dinero(p.precio)}
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
                        "w-32 text-right font-mono tabular-nums",
                        precio === null && "border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500",
                      )}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:px-6">
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
      </div>
    </div>
  );
}
