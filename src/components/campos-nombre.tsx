import { Entrada, Etiqueta } from "@/components/ui";

type Valores = {
  primer_nombre?: string | null;
  segundo_nombre?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
};

// Nombres y apellidos en dos columnas; la server action los lee con leerNombres.
export function CamposNombre({ valores }: { valores?: Valores }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Etiqueta texto="Primer nombre">
        <Entrada name="primer_nombre" required maxLength={40} defaultValue={valores?.primer_nombre ?? ""} autoComplete="given-name" />
      </Etiqueta>
      <Etiqueta texto="Segundo nombre (opcional)">
        <Entrada name="segundo_nombre" maxLength={40} defaultValue={valores?.segundo_nombre ?? ""} autoComplete="additional-name" />
      </Etiqueta>
      <Etiqueta texto="Primer apellido">
        <Entrada name="primer_apellido" required maxLength={40} defaultValue={valores?.primer_apellido ?? ""} autoComplete="family-name" />
      </Etiqueta>
      <Etiqueta texto="Segundo apellido">
        {/* No hay un autocompletado para el segundo apellido; family-name repetiría el primero */}
        <Entrada name="segundo_apellido" required maxLength={40} defaultValue={valores?.segundo_apellido ?? ""} autoComplete="off" />
      </Etiqueta>
    </div>
  );
}
