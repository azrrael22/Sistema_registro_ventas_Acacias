import type { Metadata } from "next";
import { dinero } from "@/lib/formato";
import { GRANULARIDADES, leerFiltros, nombrePeriodo, obtenerReporte } from "@/server/reportes";
import { Aviso, Boton, Entrada, Etiqueta, Selector, Tarjeta, Titulo, Vacio } from "@/components/ui";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  const filtros = leerFiltros(await searchParams);
  const { filas, error } = await obtenerReporte(filtros);

  const periodos = [...new Set(filas.map((f) => f.periodo))];
  const totalVentas = filas.reduce((t, f) => t + f.ventas_netas, 0);
  const totalRetiros = filas.reduce((t, f) => t + f.retiros, 0);
  const totalUnidades = filas.reduce((t, f) => t + f.unidades, 0);
  const maxVentas = Math.max(1, ...filas.map((f) => f.ventas_netas));
  const qs = new URLSearchParams(filtros).toString();

  return (
    <>
      <Titulo>Reportes de mis productos</Titulo>
      <Tarjeta className="mb-4">
        <form className="flex flex-wrap items-end gap-3">
          <Etiqueta texto="Agrupar">
            <Selector name="g" defaultValue={filtros.g}>
              {Object.entries(GRANULARIDADES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </Selector>
          </Etiqueta>
          <Etiqueta texto="Desde">
            <Entrada name="desde" type="date" defaultValue={filtros.desde} />
          </Etiqueta>
          <Etiqueta texto="Hasta">
            <Entrada name="hasta" type="date" defaultValue={filtros.hasta} />
          </Etiqueta>
          <Boton type="submit">Ver</Boton>
          {filas.length > 0 && (
            <a href={`/reportes/csv?${qs}`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-100">
              Descargar CSV
            </a>
          )}
        </form>
      </Tarjeta>

      {error && <Aviso>{error.message}</Aviso>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { t: "Ventas netas", v: dinero(totalVentas) },
          { t: "Retiros", v: dinero(totalRetiros) },
          { t: "Pendiente por retirar", v: dinero(totalVentas - totalRetiros) },
          { t: "Unidades", v: totalUnidades.toLocaleString("es-CO") },
        ].map((k) => (
          <Tarjeta key={k.t} className="p-3">
            <p className="text-xs text-stone-500">{k.t}</p>
            <p className="text-lg font-semibold tabular-nums">{k.v}</p>
          </Tarjeta>
        ))}
      </div>

      {!filas.length ? (
        <Vacio>No hay movimientos de tus productos en este rango. Recuerda que solo ves los productos donde eres socio.</Vacio>
      ) : (
        <div className="flex flex-col gap-4">
          {periodos.map((per) => {
            const delPeriodo = filas.filter((f) => f.periodo === per);
            return (
              <Tarjeta key={per} className="overflow-x-auto">
                <h2 className="mb-2 font-semibold capitalize">{nombrePeriodo(per, filtros.g)}</h2>
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-xs text-stone-500">
                      <th className="py-2 font-medium">Producto</th>
                      <th className="py-2 text-right font-medium">Unidades</th>
                      <th className="py-2 pl-4 font-medium">Ventas netas</th>
                      <th className="py-2 text-right font-medium">Retiros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {delPeriodo.map((f) => (
                      <tr key={f.producto}>
                        <td className="py-2">{f.producto}</td>
                        <td className="py-2 text-right tabular-nums">{f.unidades}</td>
                        <td className="py-2 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-stone-100" aria-hidden>
                              <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${Math.max(0, (f.ventas_netas / maxVentas) * 100)}%` }} />
                            </div>
                            <span className="w-28 text-right tabular-nums">{dinero(f.ventas_netas)}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right tabular-nums">{dinero(f.retiros)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-200 font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right tabular-nums">{delPeriodo.reduce((t, f) => t + f.unidades, 0)}</td>
                      <td className="py-2 pl-4 text-right tabular-nums">{dinero(delPeriodo.reduce((t, f) => t + f.ventas_netas, 0))}</td>
                      <td className="py-2 text-right tabular-nums">{dinero(delPeriodo.reduce((t, f) => t + f.retiros, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </Tarjeta>
            );
          })}
        </div>
      )}
    </>
  );
}
