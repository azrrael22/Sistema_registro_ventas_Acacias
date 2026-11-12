import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { dinero, dineroCorto, fecha, fechaCorta, hoy, mensajeError, porcentaje, rangoFechas } from "@/lib/formato";
import { PERIODOS, leerFiltros, obtenerReporte, type Filtros, type Periodo } from "@/server/reportes";
import { Aviso, Boton, Entrada, Etiqueta, Monto, Pestanas, Tarjeta, Titulo, Vacio, claseBoton, cx } from "@/components/ui";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Marca } from "@/components/marca";

export const metadata: Metadata = { title: "Reportes" };

type Reporte = Awaited<ReturnType<typeof obtenerReporte>>;

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  const filtros = leerFiltros(await searchParams);

  return (
    <>
      <Titulo>Reportes</Titulo>

      <Pestanas
        etiqueta="Periodo del reporte"
        opciones={(Object.keys(PERIODOS) as Periodo[]).map((g) => ({ href: `/reportes?g=${g}`, texto: PERIODOS[g].texto, activa: filtros.g === g }))}
      />

      {filtros.g === "rango" && (
        <Tarjeta className="mb-4 print:hidden">
          {/* key: vuelve a montar los campos con las fechas corregidas (p. ej. si venían invertidas) */}
          <Form key={filtros.qs} action="/reportes" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="g" value="rango" />
            <Etiqueta texto="Desde">
              <Entrada name="desde" type="date" defaultValue={filtros.desde} max={hoy()} required />
            </Etiqueta>
            <Etiqueta texto="Hasta">
              <Entrada name="hasta" type="date" defaultValue={filtros.hasta} max={hoy()} required />
            </Etiqueta>
            <Boton type="submit">Generar reporte</Boton>
          </Form>
        </Tarjeta>
      )}

      {/* Con key, cada cambio de periodo muestra "Generando reporte…" hasta que llegan los datos */}
      <Suspense key={filtros.qs} fallback={<Generando />}>
        <ContenidoReporte filtros={filtros} />
      </Suspense>
    </>
  );
}

async function ContenidoReporte({ filtros }: { filtros: Filtros }) {
  const r = await obtenerReporte(filtros);
  if (r.error) return <Aviso>{mensajeError(r.error)}</Aviso>;
  if (!r.esSocio) {
    return (
      <Vacio>
        Aún no eres socio de ninguna categoría.{" "}
        <Link href="/productos" className="font-medium text-emerald-700 hover:underline">Hazte socio</Link> para ver reportes de tus productos.
      </Vacio>
    );
  }

  const nombre = filtros.g === "rango" ? "Reporte personalizado" : `Reporte ${PERIODOS[filtros.g].texto.toLowerCase()}`;
  const rango = rangoFechas(filtros.desde, filtros.hasta);
  const { total, anterior } = r;

  return (
    <div className="flex flex-col gap-4">
      {filtros.generado && <Aviso tipo="ok">{nombre} generado: {rango}</Aviso>}

      <Tarjeta className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 hidden items-center gap-2 text-sm font-medium print:flex">
            <Marca className="size-4" /> Las Acacias · Reporte de mis productos
          </p>
          <p className="text-sm text-stone-500">{nombre}</p>
          <h2 className="mt-0.5 text-xl font-medium text-stone-900">{rango}</h2>
          <p className="mt-1 text-sm text-stone-500">
            Comparado con {rangoFechas(filtros.antDesde, filtros.antHasta)} · Generado el {fecha(new Date().toISOString())}
          </p>
        </div>
        {r.productos.length > 0 && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <a href={`/reportes/csv?${filtros.qs}`} className={claseBoton("secundario")}>
              Descargar CSV
            </a>
            <BotonImprimir />
          </div>
        )}
      </Tarjeta>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador titulo="Ventas netas" valor={<Monto valor={total.ventas} />}>
          <Variacion actual={total.ventas} anterior={anterior.ventas} />
        </Indicador>
        <Indicador titulo="Unidades vendidas" valor={total.unidades.toLocaleString("es-CO")}>
          <Variacion actual={total.unidades} anterior={anterior.unidades} />
        </Indicador>
        <Indicador titulo="Retiros" valor={<Monto valor={total.retiros} />}>
          {/* Más retiros no es bueno ni malo: variación en color neutro */}
          <Variacion actual={total.retiros} anterior={anterior.retiros} neutral />
        </Indicador>
        <Indicador titulo="Balance del periodo" valor={<Monto valor={total.ventas - total.retiros} />}>
          <p className="text-xs text-stone-500">Ventas netas − retiros</p>
        </Indicador>
      </div>

      {!r.productos.length ? (
        <Vacio>Tus productos no tienen movimientos ni inventario en el periodo {rango}</Vacio>
      ) : (
        <>
          <Tendencia tramos={r.tramos} paso={r.paso} />
          <TablaProductos productos={r.productos} total={total} />
        </>
      )}
    </div>
  );
}

function Indicador({ titulo, valor, children }: { titulo: string; valor: React.ReactNode; children: React.ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-1">
      <p className="text-sm text-stone-500">{titulo}</p>
      <p className="text-xl font-medium text-stone-900 tabular-nums sm:text-2xl">{valor}</p>
      {children}
    </Tarjeta>
  );
}

function Variacion({ actual, anterior, neutral }: { actual: number; anterior: number; neutral?: boolean }) {
  if (!anterior) {
    return <p className="text-xs text-stone-500">{actual ? "Sin datos del periodo anterior" : "Sin cambios"}</p>;
  }
  const cambio = (actual - anterior) / Math.abs(anterior);
  const color = neutral || !cambio ? "text-stone-600" : cambio > 0 ? "text-emerald-700" : "text-red-700";
  return (
    <p className={cx("text-xs font-medium tabular-nums", color)}>
      <span aria-hidden>{cambio > 0 ? "▲" : cambio < 0 ? "▼" : "■"}</span> {porcentaje(cambio, true)}{" "}
      <span className="font-normal text-stone-500">vs periodo anterior</span>
    </p>
  );
}

// Tope "redondo" del eje (62.000 → 80.000) para que las marcas (0, mitad, tope) sean números limpios
function techo(n: number) {
  if (n <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * p).find((v) => v >= n)!;
}

function Tendencia({ tramos, paso }: { tramos: Reporte["tramos"]; paso: number }) {
  const max = Math.max(0, ...tramos.map((t) => t.ventas));
  const tope = techo(max);
  const unidad = paso === 0 ? "semana" : paso === 1 ? "mes" : `${paso} meses`;
  const titulo = `Ventas netas por ${unidad}`;
  const rangoTramo = (t: Reporte["tramos"][number]) => (t.inicio === t.fin ? fechaCorta(t.fin) : rangoFechas(t.inicio, t.fin));

  return (
    <Tarjeta className="break-inside-avoid">
      <h3 className="font-medium text-stone-900">{titulo}</h3>
      <p className="mb-6 text-xs text-stone-500">En verde, el periodo más reciente. Pasa el cursor sobre una barra para ver el detalle.</p>
      {!max ? (
        <p className="py-10 text-center text-sm text-stone-500">No hubo ventas en este periodo</p>
      ) : (
        <div className="flex gap-2" role="img" aria-label={`${titulo}: ${tramos.map((t) => `${rangoTramo(t)}, ${dinero(t.ventas)}`).join("; ")}`}>
          {/* Eje Y */}
          <div className="relative h-44 w-14 shrink-0 text-right font-mono text-[11px] text-stone-500" aria-hidden>
            {[0, 0.5, 1].map((k) => (
              <span key={k} className="absolute right-0 translate-y-1/2" style={{ bottom: `${k * 100}%` }}>
                {dineroCorto(k * tope)}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              {[0, 0.5, 1].map((k) => (
                <div key={k} className="absolute inset-x-0 border-t border-stone-200" style={{ bottom: `${k * 100}%` }} aria-hidden />
              ))}
              <div className="absolute inset-0 flex gap-0.5">
                {tramos.map((t, i) => {
                  const alto = (Math.max(0, t.ventas) / tope) * 100;
                  // Solo el tramo más reciente lleva el verde; los anteriores quedan en gris
                  const reciente = i === tramos.length - 1;
                  // El tooltip se alinea al borde en las barras de los extremos para no salirse de la tarjeta
                  const lado = i < tramos.length / 3 ? "left-0" : i >= (tramos.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <div key={t.inicio} tabIndex={0} className="group relative flex-1 rounded-sm outline-none focus-visible:bg-stone-100">
                      <div
                        className={cx(
                          "absolute inset-x-0 bottom-0 mx-auto w-full max-w-6 rounded-t transition-colors",
                          reciente
                            ? "bg-emerald-600 group-hover:bg-emerald-700 group-focus-visible:bg-emerald-700"
                            : "bg-stone-300 group-hover:bg-stone-400 group-focus-visible:bg-stone-400",
                        )}
                        style={{ height: `${alto}%` }}
                      />
                      {t.ventas === max && (
                        <span
                          className="absolute inset-x-0 text-center font-mono text-[11px] whitespace-nowrap text-stone-700"
                          style={{ bottom: `calc(${alto}% + 2px)` }}
                          aria-hidden
                        >
                          {dineroCorto(t.ventas)}
                        </span>
                      )}
                      <div
                        role="tooltip"
                        className={cx(
                          "pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-lg bg-stone-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus-visible:block print:hidden",
                          lado,
                        )}
                      >
                        <p className="font-medium">{rangoTramo(t)}</p>
                        <p>Ventas netas: <Monto valor={t.ventas} /></p>
                        <p className="tabular-nums">Unidades: {t.unidades}</p>
                        {t.retiros > 0 && <p>Retiros: <Monto valor={t.retiros} /></p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Eje X: fecha de inicio de cada tramo (en pantallas pequeñas, una sí y otra no si son muchas) */}
            <div className="mt-1.5 flex gap-0.5 text-center font-mono text-[11px] text-stone-500" aria-hidden>
              {tramos.map((t, i) => (
                <span key={t.inicio} className={cx("min-w-0 flex-1 truncate", tramos.length > 6 && i % 2 === 1 && "max-sm:invisible")}>
                  {fechaCorta(t.inicio, false)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Tarjeta>
  );
}

function TablaProductos({ productos, total }: { productos: Reporte["productos"]; total: Reporte["total"] }) {
  const num = (n: number) => n.toLocaleString("es-CO");
  // La primera y la última columna se alinean con el relleno de la tarjeta
  const borde = "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5";
  const th = cx("px-3 py-2 font-medium", borde);
  const td = cx("px-3 py-2.5 text-right tabular-nums", borde);

  return (
    <Tarjeta className="overflow-hidden p-0">
      <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
        <h3 className="font-medium text-stone-900">Detalle por producto</h3>
        <p className="text-xs text-stone-500">
          <strong className="font-medium text-stone-600">Base:</strong> stock al inicio del periodo + entradas ·{" "}
          <strong className="font-medium text-stone-600">Quedan:</strong> stock al cierre del periodo
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr className="border-b border-stone-200">
              <th className={cx(th, "text-left")}>Producto</th>
              <th className={cx(th, "text-right")}>Base</th>
              <th className={cx(th, "text-right")}>Vendidas</th>
              <th className={cx(th, "text-right")}>Quedan</th>
              <th className={cx(th, "text-left")}>Ventas netas</th>
              <th className={cx(th, "text-right")}>Retiros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {productos.map((p) => {
              const parte = total.ventas > 0 ? Math.max(0, p.ventas) / total.ventas : 0;
              return (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className={cx("px-3 py-2.5", borde)}>
                    <p className="font-medium text-stone-900">{p.nombre}</p>
                    <p className="text-xs text-stone-500">{p.categoria}</p>
                  </td>
                  <td className={td}>{num(p.base)}</td>
                  <td className={td}>{num(p.unidades)}</td>
                  <td className={cx(td, p.quedan <= 3 ? "font-medium text-amber-700" : "text-stone-900")}>{num(p.quedan)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 shrink-0 rounded-full bg-stone-100" aria-hidden>
                        <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${parte * 100}%` }} />
                      </div>
                      <Monto valor={p.ventas} />
                      <span className="text-xs text-stone-500 tabular-nums">{porcentaje(parte)}</span>
                    </div>
                  </td>
                  <td className={td}>
                    <Monto valor={p.retiros} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* El total va después de la línea punteada, como en el tiquete */}
          <tfoot className="bg-stone-50 font-medium text-stone-900">
            <tr className="border-t border-dashed border-stone-300">
              <td className={cx("px-3 py-2.5", borde)}>Total</td>
              <td className={td}>{num(total.base)}</td>
              <td className={td}>{num(total.unidades)}</td>
              <td className={td}>{num(total.quedan)}</td>
              <td className="px-3 py-2.5">
                <Monto valor={total.ventas} />
              </td>
              <td className={td}>
                <Monto valor={total.retiros} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Tarjeta>
  );
}

function Generando() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-sm font-medium text-stone-600">
        <span className="size-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" aria-hidden />
        Generando reporte…
      </p>
      <div className="h-24 animate-pulse rounded-xl bg-stone-100" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-stone-100" />
    </div>
  );
}
