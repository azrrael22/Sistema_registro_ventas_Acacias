import { horaDe, porDia, stockBajo, tituloDia } from "@/lib/formato";
import { describirMovimiento, stockPorProducto } from "@/lib/inventario";
import { Entrada, Etiqueta, Selector, Tarjeta, Vacio, cx } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { registrarMovimiento } from "./actions";

type Producto = { id: number; nombre: string; categorias: { nombre: string } | null };
type Movimiento = {
  id: number;
  tipo: string;
  cantidad: number;
  fecha: string;
  nota: string | null;
  productos: { nombre: string } | null;
  empleados: { nombre: string } | null;
};
type Props = {
  // Es socio de alguna categoría
  esSocio: boolean;
  // Sus productos que llevan inventario
  productos: Producto[];
  stock: { producto_id: number | null; stock: number | null }[];
  movimientos: Movimiento[];
};

export function VistaInventario({ esSocio, productos, stock, movimientos }: Props) {
  if (!esSocio) return <Vacio>Solo los socios manejan inventario. Hazte socio de una categoría en “Productos y socios”.</Vacio>;
  if (!productos.length) return <Vacio>Tus productos no llevan inventario. Se activa al editar cada producto en “Productos y socios”.</Vacio>;
  return (
    // items-start: cada tarjeta con su altura, sin franja vacía al fondo de la más corta
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <FormMovimiento productos={productos} />
      <ListaStock productos={productos} stockPor={stockPorProducto(stock)} />
      <UltimosMovimientos movimientos={movimientos} />
    </div>
  );
}

function FormMovimiento({ productos }: { productos: Producto[] }) {
  return (
    <Tarjeta>
      <h2 className="mb-4 font-medium text-stone-900 dark:text-stone-50">Registrar movimiento</h2>
      <FormAccion accion={registrarMovimiento} className="group/mov flex flex-col gap-3">
        <Etiqueta texto="Producto">
          <Selector name="producto_id" required>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>{p.categorias?.nombre} · {p.nombre}</option>
            ))}
          </Selector>
        </Etiqueta>
        <Etiqueta texto="Tipo">
          <Selector name="tipo">
            <option value="entrada">Entrada de mercancía</option>
            <option value="conteo">Conteo físico</option>
            <option value="ajuste">Ajuste manual</option>
          </Selector>
        </Etiqueta>
        <Etiqueta texto="Cantidad">
          <Entrada name="cantidad" type="number" step="1" required aria-describedby="pista-cantidad" />
        </Etiqueta>
        {/* La pista cambia con el tipo elegido, solo con CSS (:has). Fuera de la etiqueta para no
            sumarse al nombre del campo; -mt-2 la deja a 4 px, como el espacio entre etiqueta y campo. */}
        <p id="pista-cantidad" className="-mt-2 text-xs text-stone-500 dark:text-stone-400">
          <span className="hidden group-has-[option[value=entrada]:checked]/mov:inline">Unidades que llegaron</span>
          <span className="hidden group-has-[option[value=conteo]:checked]/mov:inline">Cuántas unidades hay ahora; se registra la diferencia</span>
          <span className="hidden group-has-[option[value=ajuste]:checked]/mov:inline">Positivo suma; negativo resta y cuenta como pérdida</span>
        </p>
        <Etiqueta texto="Nota (opcional)">
          <Entrada name="nota" />
        </Etiqueta>
        <BotonEnvio>Registrar</BotonEnvio>
      </FormAccion>
    </Tarjeta>
  );
}

function ListaStock({ productos, stockPor }: { productos: Producto[]; stockPor: Map<number | null, number> }) {
  return (
    <Tarjeta>
      <h2 className="mb-2 font-medium text-stone-900 dark:text-stone-50">Stock actual</h2>
      <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
        {productos.map((p) => (
          <FilaStock key={p.id} producto={p} disponibles={stockPor.get(p.id) ?? 0} />
        ))}
      </ul>
    </Tarjeta>
  );
}

function FilaStock({ producto: p, disponibles }: { producto: Producto; disponibles: number }) {
  return (
    <li className="flex justify-between gap-4 py-2.5">
      <span className="text-stone-900 dark:text-stone-50">{p.nombre} <span className="text-stone-500 dark:text-stone-400">· {p.categorias?.nombre}</span></span>
      <span className={cx("cifra font-medium", stockBajo(disponibles) ? "text-amber-700 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")}>{disponibles}</span>
    </li>
  );
}

function UltimosMovimientos({ movimientos }: { movimientos: Movimiento[] }) {
  return (
    <Tarjeta className="md:col-span-2">
      <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">Últimos movimientos</h2>
      {!movimientos.length ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Sin movimientos todavía</p>
      ) : (
        // Por día, como en Ventas: la fecha va en el encabezado y cada fila lleva la hora
        <div className="flex flex-col gap-4">
          {porDia(movimientos).map(([dia, delDia]) => (
            <div key={dia}>
              <h3 className="text-sm font-medium text-stone-500 dark:text-stone-400">{tituloDia(dia)}</h3>
              <ul className="divide-y divide-stone-100 text-sm dark:divide-stone-700">
                {delDia.map((m) => (
                  <FilaMovimiento key={m.id} movimiento={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

function FilaMovimiento({ movimiento: m }: { movimiento: Movimiento }) {
  const { perdida, cantidad, etiqueta } = describirMovimiento(m);
  return (
    <li className="flex items-baseline gap-3 py-2.5">
      {/* Las cantidades con signo en una columna alineada a la derecha */}
      <span className={cx("cifra w-10 shrink-0 text-right font-medium", perdida ? "text-amber-700 dark:text-amber-400" : "text-stone-900 dark:text-stone-50")}>
        {cantidad}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-stone-900 dark:text-stone-50">{m.productos?.nombre}</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400">
          {etiqueta} · {m.empleados?.nombre}
          {m.nota && <> · “{m.nota}”</>}
        </span>
      </span>
      <span className="cifra shrink-0 text-xs text-stone-500 dark:text-stone-400">{horaDe(m.fecha)}</span>
    </li>
  );
}
