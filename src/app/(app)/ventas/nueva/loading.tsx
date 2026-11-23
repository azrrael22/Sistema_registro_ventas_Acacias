import { Esqueleto, Titulo } from "@/components/ui";

// Vender es la pantalla que más se abre: el esqueleto ya tiene su título, el buscador y las tarjetas
export default function CargandoVender() {
  return (
    <>
      <Titulo>Registrar venta</Titulo>
      <div role="status" className="lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-6">
        <span className="sr-only">Cargando productos…</span>
        <div>
          <Esqueleto className="h-10 rounded-lg pointer-coarse:h-11" />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Esqueleto key={i} className="h-60 rounded-2xl" />
            ))}
          </div>
        </div>
        <Esqueleto className="hidden h-64 lg:block" />
      </div>
    </>
  );
}
