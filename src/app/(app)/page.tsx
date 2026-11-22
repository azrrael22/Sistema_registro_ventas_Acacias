import Link from "next/link";
import { createClient } from "@/server/supabase";
import { requerirEmpleadoActivo } from "@/server/sesion";
import { misProductos } from "@/server/consultas";
import { Monto, Tarjeta, claseBoton, cx } from "@/components/ui";
import { IconoFlecha, IconoMas } from "@/components/iconos";

export default async function InicioPage() {
  const empleado = await requerirEmpleadoActivo();
  const productos = await misProductos(empleado.id);
  const ids = productos.map((p) => p.id);
  const categorias = [...new Set(productos.map((p) => p.categoria_id))];
  const supabase = await createClient();
  const [{ data: saldos }, { data: stock }, { count: pendientes }] = await Promise.all([
    supabase.from("saldo_categoria").select("categoria_id, saldo").in("categoria_id", categorias),
    supabase.from("stock_producto").select("producto_id, stock").in("producto_id", ids),
    empleado.es_admin
      ? supabase.from("empleados").select("id", { count: "exact", head: true }).eq("activo", false)
      : Promise.resolve({ count: 0 }),
  ]);
  const saldoPor = new Map(saldos?.map((s) => [s.categoria_id, Number(s.saldo ?? 0)]));
  const stockPor = new Map(stock?.map((s) => [s.producto_id, Number(s.stock ?? 0)]));
  const sociedades = categorias.map((id) => {
    const prods = productos.filter((p) => p.categoria_id === id);
    return { id, cat: prods[0].categorias?.nombre ?? "", prods, saldo: saldoPor.get(id) ?? 0 };
  });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="sr-only">Inicio</h1>
      <div className="flex flex-col gap-3">
        <Link href="/ventas/nueva" className={claseBoton("primario", "h-16 rounded-xl text-lg")}>
          <IconoMas /> Registrar venta
        </Link>
        {!!pendientes && (
          <Link href="/admin/empleados" className="tarjeta flex items-center gap-3 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-700">
            <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <span className="flex-1 text-stone-900 dark:text-stone-50">
              {pendientes} {pendientes === 1 ? "empleado espera" : "empleados esperan"} aprobación
            </span>
            <span className="text-stone-500 dark:text-stone-400">Revisar</span>
            <IconoFlecha className="text-stone-400 dark:text-stone-500" />
          </Link>
        )}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium text-stone-900 dark:text-stone-50">Mis sociedades</h2>
          {sociedades.length > 1 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Por retirar en total <Monto valor={sociedades.reduce((t, s) => t + s.saldo, 0)} className="text-stone-900 dark:text-stone-50" />
            </p>
          )}
        </div>
        {!sociedades.length ? (
          <Tarjeta className="text-sm text-stone-600 dark:text-stone-400">
            Aún no eres socio de ninguna categoría. <Link href="/productos" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">Ver productos</Link>
          </Tarjeta>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sociedades.map(({ id, cat, prods, saldo }) => (
              <Tarjeta key={id}>
                <h3 className="font-medium text-stone-900 dark:text-stone-50">{cat}</h3>
                <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">Por retirar</p>
                <Monto valor={saldo} className="mt-1 block text-3xl font-medium text-stone-900 dark:text-stone-50" />
                <ul className="mt-5 divide-y divide-stone-100 border-t border-stone-100 text-sm dark:divide-stone-700 dark:border-stone-700">
                  {prods.map((p) => {
                    const disponibles = stockPor.get(p.id) ?? 0;
                    return (
                      <li key={p.id} className="flex justify-between gap-4 py-2">
                        <span className="text-stone-700 dark:text-stone-200">{p.nombre}</span>
                        <span className={cx("tabular-nums", disponibles <= 3 ? "text-amber-700 dark:text-amber-400" : "text-stone-500 dark:text-stone-400")}>{disponibles} en stock</span>
                      </li>
                    );
                  })}
                </ul>
              </Tarjeta>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
