"use client";

import { useMemo, useState, useTransition } from "react";
import { Aviso, Boton, Entrada, cx } from "@/components/ui";
import { dinero } from "@/lib/formato";
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
    <div className="pb-40">
      <Entrada
        type="search"
        placeholder="Buscar producto…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4"
        aria-label="Buscar producto"
      />
      {mensaje?.ok && <div className="mb-4"><Aviso tipo="ok">{mensaje.ok}</Aviso></div>}

      <ul className="flex flex-col gap-2">
        {filtrados.map((p, i) => {
          const encabezado = p.categoria !== filtrados[i - 1]?.categoria ? p.categoria : null;
          const cant = cantidades[p.id] ?? 0;
          const agotado = p.stock <= 0;
          return (
            <li key={p.id}>
              {encabezado && (
                <h2 className="mt-3 mb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">{encabezado}</h2>
              )}
              <div
                className={cx(
                  "flex items-center justify-between gap-3 rounded-xl border bg-white p-3",
                  cant > 0 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-stone-200",
                  agotado && "opacity-50",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.nombre}</p>
                  <p className="text-sm text-stone-600">
                    {dinero(p.precio)} · <span className={p.stock <= 3 ? "text-amber-700" : ""}>{agotado ? "Agotado" : `${p.stock} disp.`}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Boton variante="secundario" className="size-10 px-0 text-lg" onClick={() => cambiar(p, -1)} disabled={cant === 0} aria-label={`Quitar un ${p.nombre}`}>−</Boton>
                  <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{cant}</span>
                  <Boton variante="secundario" className="size-10 px-0 text-lg" onClick={() => cambiar(p, 1)} disabled={cant >= p.stock} aria-label={`Agregar un ${p.nombre}`}>+</Boton>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2">
          {mensaje?.error && <Aviso>{mensaje.error}</Aviso>}
          <Entrada placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} aria-label="Nota" />
          <Boton onClick={confirmar} disabled={!unidades || enviando} className="w-full text-base">
            {enviando ? "Registrando…" : unidades ? `Registrar venta · ${unidades} und · ${dinero(total)}` : "Selecciona productos"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
