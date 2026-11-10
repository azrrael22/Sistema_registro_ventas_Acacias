import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requerirEmpleadoActivo } from "@/lib/sesion";
import { misProductos } from "@/lib/consultas";
import { dinero } from "@/lib/formato";
import { Tarjeta } from "@/components/ui";

export default async function InicioPage() {
  const empleado = await requerirEmpleadoActivo();
  const productos = await misProductos(empleado.id);
  const ids = productos.map((p) => p.id);
  const supabase = await createClient();
  const [{ data: saldos }, { data: stock }, { count: pendientes }] = await Promise.all([
    supabase.from("saldo_producto").select("producto_id, saldo").in("producto_id", ids),
    supabase.from("stock_producto").select("producto_id, stock").in("producto_id", ids),
    empleado.es_admin
      ? supabase.from("empleados").select("id", { count: "exact", head: true }).eq("activo", false)
      : Promise.resolve({ count: 0 }),
  ]);
  const saldoPor = new Map(saldos?.map((s) => [s.producto_id, Number(s.saldo ?? 0)]));
  const stockPor = new Map(stock?.map((s) => [s.producto_id, Number(s.stock ?? 0)]));
  const categorias = [...new Set(productos.map((p) => p.categorias?.nombre ?? ""))];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {empleado.nombre.split(" ")[0]} 👋</h1>
        <p className="text-sm text-stone-600">¿Qué vas a hacer hoy?</p>
      </div>

      <Link href="/ventas/nueva" className="flex items-center justify-center rounded-xl bg-emerald-700 py-5 text-lg font-semibold text-white shadow-sm hover:bg-emerald-800">
        + Registrar venta
      </Link>

      {!!pendientes && (
        <Link href="/admin/empleados" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 hover:bg-amber-100">
          🙋 Hay {pendientes} {pendientes === 1 ? "empleado esperando" : "empleados esperando"} aprobación →
        </Link>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Mis sociedades</h2>
        {!categorias.length ? (
          <Tarjeta className="text-sm text-stone-600">
            Aún no eres socio de ninguna categoría. <Link href="/productos" className="font-medium text-emerald-700 hover:underline">Ver productos</Link>
          </Tarjeta>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {categorias.map((cat) => {
              const prods = productos.filter((p) => (p.categorias?.nombre ?? "") === cat);
              const saldo = prods.reduce((t, p) => t + (saldoPor.get(p.id) ?? 0), 0);
              return (
                <Tarjeta key={cat}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{cat}</h3>
                    <span className="text-sm text-stone-500">por retirar <strong className="text-stone-900">{dinero(saldo)}</strong></span>
                  </div>
                  <ul className="mt-2 text-sm text-stone-700">
                    {prods.map((p) => (
                      <li key={p.id} className="flex justify-between py-0.5">
                        <span>{p.nombre}</span>
                        <span className={(stockPor.get(p.id) ?? 0) <= 3 ? "text-amber-700" : "text-stone-500"}>stock {stockPor.get(p.id) ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
