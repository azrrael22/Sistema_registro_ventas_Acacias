"use client";

import { useEffect, useRef, useState } from "react";
import { Entrada, Etiqueta, Selector, cx } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { dinero } from "@/lib/formato";

type Categoria = { id: number; nombre: string | null; saldo: number };

// Campos del formulario de retiro. El monto se ve con formato mientras se escribe y el botón dice
// cuánto se retira, para que un cero de más no pase sin verse: el retiro se notifica a los socios.
// La base de datos igual impide retirar más que el saldo.
export function CamposRetiro({ categorias }: { categorias: Categoria[] }) {
  const campos = useRef<HTMLDivElement>(null);
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id);
  const [monto, setMonto] = useState("");

  // React vacía el formulario después de cada envío: el estado vuelve a empezar con él
  useEffect(() => {
    const form = campos.current?.closest("form");
    const limpiar = () => {
      setMonto("");
      setCategoriaId(categorias[0]?.id);
    };
    form?.addEventListener("reset", limpiar);
    return () => form?.removeEventListener("reset", limpiar);
  }, [categorias]);

  const saldo = categorias.find((c) => c.id === categoriaId)?.saldo ?? 0;
  const valor = Number(monto);
  const escrito = monto.trim() !== "" && Number.isInteger(valor) && valor > 0;
  const excede = escrito && valor > saldo;

  return (
    <div ref={campos} className="flex flex-col gap-3">
      <Etiqueta texto="Categoría">
        <Selector name="categoria_id" required value={categoriaId} onChange={(e) => setCategoriaId(Number(e.target.value))}>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} · disponible {dinero(c.saldo)}
            </option>
          ))}
        </Selector>
      </Etiqueta>
      <Etiqueta texto="Monto">
        <Entrada
          name="monto"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          required
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          aria-describedby="pista-monto"
          aria-invalid={excede || undefined}
          className={cx("font-mono tabular-nums", excede && "border-amber-600 focus:border-amber-600 focus:ring-amber-600/20 dark:border-amber-500 dark:focus:border-amber-500")}
        />
      </Etiqueta>
      {/* Fuera de la etiqueta para no sumarse al nombre del campo; -mt-2 la deja a 4 px del campo */}
      <p id="pista-monto" className={cx("-mt-2 text-xs tabular-nums", excede ? "font-medium text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>
        {!escrito
          ? `Disponible: ${dinero(saldo)}`
          : excede
            ? `Supera lo disponible en esta categoría (${dinero(saldo)})`
            : `${dinero(valor)} de ${dinero(saldo)} disponibles`}
      </p>
      <Etiqueta texto="Nota (opcional)">
        <Entrada name="nota" />
      </Etiqueta>
      <BotonEnvio disabled={excede} pendiente="Registrando…">
        {escrito && !excede ? `Retirar ${dinero(valor)}` : "Registrar retiro"}
      </BotonEnvio>
    </div>
  );
}
