import "server-only";
import { createClient } from "@/server/supabase";
import { destinoNotificacion } from "@/lib/notificaciones";

// Marca como leída una notificación y devuelve la pantalla a la que lleva (null si no tiene una
// propia, o si no es del usuario). La RLS solo deja tocar las propias, y el destino sale de la fila
// guardada, nunca de lo que mande el cliente: no hay redirección abierta. Lo usan la lista de
// notificaciones (abrirNotificacion) y el enlace de los correos (/notificaciones/[id]).
export async function marcarLeida(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", id)
    .select("tipo, datos")
    .maybeSingle();
  return { destino: data ? destinoNotificacion(data.tipo, data.datos) : null, error };
}
