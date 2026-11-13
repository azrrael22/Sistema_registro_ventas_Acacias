"use client";

import { useMemo, useState, useTransition } from "react";
import { Aviso, Boton, Entrada, Monto, cx } from "@/components/ui";
import { IconoMas, IconoMenos } from "@/components/iconos";
import { registrarVenta } from "../actions";

type Producto = { id: number; nombre: string; precio: number; categoria: string; stock: number };

export function Carrito({ productos }: { productos: Producto[] }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [nota, setNota] = useState("");
  const [mensaje, setMensaje] = useState<{ error?: string; ok?: string }>();
  const [enviando, startTransition] = useTransition();

  const cambiar = (p: Producto, delta: number) => {
    setMensaje(undefined);
    setCantidades((c) => ({ ...c, [p.id]: Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + delta)) }));
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? productos.filter((p) => `${p.nombre} ${p.categoria}`.toLowerCase().includes(q)) : productos;
  }, [busqueda, productos]);

  const items = productos.filter((p) => cantidades[p.id] > 0);
  const total = items.reduce((t, p) => t + p.precio * cantidades[p.id], 0);
  const unidades = items.reduce((t, p) => t + cantidades[p.id], 0);

  const confirmar = () =>
    startTransition(async () => {
      const r = await registrarVenta(
        items.map((p) => ({ producto_id: p.id, cantidad: cantidades[p.id] })),
        nota,
      );
      setMensaje(r);
      if (r?.ok) {
        setCantidades({});
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
          return (
            <li key={p.id}>
              {encabezado && <h2 className="mt-6 mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">{encabezado}</h2>}
              <div
                className={cx(
                  "flex items-center justify-between gap-3 rounded-xl border bg-white p-3 transition-colors dark:bg-stone-800",
                  cant > 0 ? "border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500" : "border-stone-200 dark:border-stone-700",
                  agotado && "opacity-50",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900 dark:text-stone-50">{p.nombre}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    <Monto valor={p.precio} /> ·{" "}
                    <span className={p.stock <= 3 ? "text-amber-700 dark:text-amber-400" : ""}>{agotado ? "Agotado" : `${p.stock} disponibles`}</span>
                  </p>
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
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:border-stone-700 dark:bg-stone-900 dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:px-6">
          {mensaje?.error && <Aviso>{mensaje.error}</Aviso>}
          <Entrada placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />
          {/* El total cierra la venta como en el tiquete: después de la línea punteada */}
          <div className="flex items-baseline justify-between border-t border-dashed border-stone-300 pt-2 dark:border-stone-600">
            <span className="text-sm text-stone-600 dark:text-stone-400">{unidades ? `${unidades} ${unidades === 1 ? "unidad" : "unidades"}` : "Sin productos"}</span>
            <Monto valor={total} className="text-xl font-medium text-stone-900 dark:text-stone-50" />
          </div>
          <Boton onClick={confirmar} disabled={!unidades || enviando} className="h-12 w-full text-base">
            {enviando ? "Registrando…" : unidades ? "Registrar venta" : "Selecciona productos"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
