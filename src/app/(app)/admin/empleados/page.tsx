import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirAdmin } from "@/server/sesion";
import { fecha } from "@/lib/formato";
import { Tarjeta, Titulo, cx } from "@/components/ui";
import { BotonEnvio } from "@/components/boton-envio";
import { FormAccion } from "@/components/form-accion";
import { actualizarEmpleado } from "./actions";

export const metadata: Metadata = { title: "Empleados" };

export default async function EmpleadosPage() {
  const yo = await requerirAdmin();
  const supabase = await createClient();
  const { data: empleados } = await supabase
    .from("empleados")
    .select("id, nombre, email, activo, es_admin, creado_en")
    .order("activo")
    .order("nombre");

  const Accion = ({ id, activo, esAdmin, texto, variante }: { id: string; activo: boolean; esAdmin: boolean; texto: string; variante?: "primario" | "secundario" | "peligro" }) => (
    <FormAccion accion={actualizarEmpleado}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activo" value={String(activo)} />
      <input type="hidden" name="es_admin" value={String(esAdmin)} />
      <BotonEnvio variante={variante ?? "secundario"} pendiente="…">{texto}</BotonEnvio>
    </FormAccion>
  );

  return (
    <>
      <Titulo>Empleados</Titulo>
      <ul className="flex flex-col gap-2">
        {empleados?.map((e) => (
          <li key={e.id}>
            <Tarjeta className={cx("flex flex-wrap items-center justify-between gap-3", !e.activo && "border-amber-300 bg-amber-50/60")}>
              <div>
                <p className="font-medium">
                  {e.nombre}
                  {e.es_admin && <span className="ml-2 rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">admin</span>}
                  {!e.activo && <span className="ml-2 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase">pendiente</span>}
                </p>
                <p className="text-sm text-stone-600">{e.email} · desde {fecha(e.creado_en)}</p>
              </div>
              {e.id === yo.id ? (
                <span className="text-sm text-stone-500">Tú</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {e.activo ? (
                    <>
                      <Accion id={e.id} activo esAdmin={!e.es_admin} texto={e.es_admin ? "Quitar admin" : "Hacer admin"} />
                      <Accion id={e.id} activo={false} esAdmin={false} texto="Desactivar" variante="peligro" />
                    </>
                  ) : (
                    <Accion id={e.id} activo esAdmin={false} texto="Aprobar" variante="primario" />
                  )}
                </div>
              )}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </>
  );
}
