"use client";

import { useMemo, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { Boton, Entrada, Vacio, claseSegmento, claseSegmentos, cx } from "@/components/ui";
import { useEnLinea } from "@/components/sin-conexion";
import { agruparPor, dinero } from "@/lib/formato";
import { mensajeFalloVenta } from "@/lib/errores";
import type { ItemVenta } from "@/lib/ventas";
import { registrarVenta } from "../actions";
import { useVentaGuardada } from "./venta-guardada";
import { PanelVenta, type Mensaje } from "./panel-venta";
import { TarjetaProducto } from "./tarjeta-producto";
import {
  VENTA_VACIA,
  cantidadEn,
  categoriasDe,
  conCantidad,
  filtrarProductos,
  itemsVenta,
  precioCobrado,
  resumenVenta,
  textoUnidades,
  type Producto,
  type Venta,
} from "./venta";

// Registra la venta y devuelve el aviso para el empleado; si quedó registrada, con lo que se vendió.
// Sin internet, se cortó la conexión o el servidor falló: vuelve como error, con si la venta pudo
// quedar registrada (para no registrarla dos veces). Las redirecciones (cuenta desactivada, sesión
// vencida) siguen su curso.
async function enviarVenta(items: ItemVenta[], nota: string, vendido: string): Promise<Mensaje> {
  try {
    const r = await registrarVenta(items, nota);
    return r?.ok ? { ok: `${r.ok} · ${vendido}` } : r;
  } catch (e) {
    unstable_rethrow(e);
    return { error: mensajeFalloVenta(e) };
  }
}

export function Carrito({ productos, empleadoId }: { productos: Producto[]; empleadoId: string }) {
  // Cantidades, precios con descuento y nota: quedan guardados en el celular hasta registrar la
  // venta o vaciarla (ver venta-guardada.ts)
  const [venta, cambiarVenta] = useVentaGuardada(`acacias:venta:${empleadoId}`);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [detalle, setDetalle] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>();
  const [enviando, startTransition] = useTransition();
  const enLinea = useEnLinea();

  const categorias = useMemo(() => categoriasDe(productos), [productos]);
  const filtrados = useMemo(() => filtrarProductos(productos, busqueda, categoria), [busqueda, categoria, productos]);
  const resumen = resumenVenta(productos, venta);

  // Cambiar productos o precios borra el aviso de la venta anterior
  const editar = (cambio: (v: Venta) => Venta) => {
    setMensaje(undefined);
    cambiarVenta(cambio);
  };
  const fijar = (p: Producto, n: number) => editar((v) => conCantidad(v, p, n));

  const terminar = () => {
    setDetalle(false);
    cambiarVenta(() => VENTA_VACIA);
  };

  const confirmar = () => {
    // Lo que se vendió, para confirmarlo después de vaciar el carrito
    const vendido = `${textoUnidades(resumen.unidades)} · ${dinero(resumen.total)}`;
    startTransition(async () => {
      const aviso = await enviarVenta(itemsVenta(resumen.lineas), venta.nota, vendido);
      setMensaje(aviso);
      // Registrada: se borra también del celular
      if (aviso?.ok) terminar();
    });
  };

  return (
    // pb-32: en celular y tablet, el final de la lista queda por encima de la barra de la venta
    <div className="pb-32 lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6 lg:pb-0">
      <div className="min-w-0">
        <Entrada type="search" placeholder="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar producto" />
        {categorias.length > 1 && <Chips opciones={categorias} activa={categoria} onCambiar={setCategoria} />}

        {filtrados.length ? (
          <div className="mt-4 flex flex-col gap-6">
            {agruparPor(filtrados, (p) => p.categoria).map(([cat, lista]) => (
              // Con una categoría elegida en el filtro, el encabezado sobra
              <Grupo key={cat} titulo={categoria ? "" : cat}>
                {lista.map((p) => (
                  <TarjetaProducto key={p.id} producto={p} cantidad={cantidadEn(venta, p)} precio={precioCobrado(venta, p)} onCantidad={(n) => fijar(p, n)} />
                ))}
              </Grupo>
            ))}
          </div>
        ) : (
          <SinResultados
            onLimpiar={() => {
              setBusqueda("");
              setCategoria(null);
            }}
          />
        )}
      </div>

      <PanelVenta
        resumen={resumen}
        textoPrecio={(p) => venta.precios[p.id] ?? p.precio}
        nota={venta.nota}
        // Un precio inválido abre el detalle para que se vea dónde corregirlo
        verDetalle={detalle || !resumen.preciosValidos}
        mensaje={mensaje}
        enLinea={enLinea}
        enviando={enviando}
        onPrecio={(p, texto) => editar((v) => ({ ...v, precios: { ...v.precios, [p.id]: texto } }))}
        onQuitar={(p) => fijar(p, 0)}
        onVaciar={() => {
          setMensaje(undefined);
          terminar();
        }}
        onNota={(texto) => cambiarVenta((v) => ({ ...v, nota: texto }))}
        onDetalle={() => setDetalle((d) => !d)}
        onRegistrar={confirmar}
      />
    </div>
  );
}

// Filtro por categoría: mismo aspecto que Pestanas, pero con botones porque es estado del cliente
function Chips({ opciones, activa, onCambiar }: { opciones: string[]; activa: string | null; onCambiar: (c: string | null) => void }) {
  const chip = (texto: string, valor: string | null) => (
    <li key={valor ?? ""}>
      <button type="button" aria-pressed={activa === valor} onClick={() => onCambiar(valor)} className={cx("cursor-pointer", claseSegmento(activa === valor))}>
        {texto}
      </button>
    </li>
  );
  return (
    <div role="group" aria-label="Filtrar por categoría" className="mt-3">
      <ul className={claseSegmentos}>
        {chip("Todos", null)}
        {opciones.map((c) => chip(c, c))}
      </ul>
    </div>
  );
}

// Una cuadrícula por categoría; sin título (sin categoría, o con el filtro puesto) no hay encabezado
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      {titulo && <h2 className="mb-2 text-sm font-medium text-stone-600 dark:text-stone-400">{titulo}</h2>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</ul>
    </div>
  );
}

function SinResultados({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="mt-4">
      <Vacio>
        Ningún producto coincide con la búsqueda
        <span className="mt-3 block">
          <Boton variante="secundario" onClick={onLimpiar}>
            Limpiar búsqueda
          </Boton>
        </span>
      </Vacio>
    </div>
  );
}
