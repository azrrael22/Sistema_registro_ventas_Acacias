import type { Metadata } from "next";
import { createClient } from "@/server/supabase";
import { requerirAdmin } from "@/server/sesion";
import { fecha } from "@/lib/formato";
import { Insignia, Tarjeta, Titulo } from "@/components/ui";
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
      <Tarjeta className="p-0">
        <ul className="divide-y divide-stone-100 dark:divide-stone-700">
          {empleados?.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-stone-900 dark:text-stone-50">
                  {e.nombre}
                  {e.es_admin && <Insignia>Admin</Insignia>}
                  {!e.activo && <Insignia variante="advertencia">Pendiente</Insignia>}
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{e.email} · desde {fecha(e.creado_en)}</p>
              </div>
              {e.id === yo.id ? (
                <span className="text-sm text-stone-500 dark:text-stone-400">Tú</span>
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
            </li>
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}
