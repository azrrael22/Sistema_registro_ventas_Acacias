import { Entrada, Etiqueta, Selector } from "@/components/ui";
import { TIPOS_DOCUMENTO, type TipoDocumento } from "@/lib/documentos";

// Tipo y número de documento; la server action los lee con leerDocumento.
export function CamposDocumento({ tipo, numero, className }: { tipo?: TipoDocumento | null; numero?: string | null; className?: string }) {
  return (
    <>
      <Etiqueta texto="Tipo de documento" className={className}>
        <Selector name="tipo_documento" required defaultValue={tipo ?? ""}>
          <option value="" disabled>Elige uno</option>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t.valor} value={t.valor}>{t.texto}</option>
          ))}
        </Selector>
      </Etiqueta>
      <Etiqueta texto="Número de documento" className={className}>
        <Entrada name="numero_documento" required defaultValue={numero ?? ""} maxLength={24} autoComplete="off" />
      </Etiqueta>
    </>
  );
}
