import { Geist_Mono } from "next/font/google";
import { Marca } from "@/components/marca";
import { TicketVenta } from "./ticket-venta";

// Solo el tiquete de muestra usa la mono, así que se carga solo en estas páginas.
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className={`${geistMono.variable} grid min-h-dvh lg:grid-cols-2`}>
      <div className="flex items-center justify-center px-4 py-10 lg:bg-white lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Marca className="size-10" />
            <h1 className="mt-4 text-2xl font-medium text-stone-900">Ventas Las Acacias</h1>
            <p className="mt-1 text-sm text-stone-600">Registro de ventas de los empleados</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">{children}</div>
        </div>
      </div>
      <div className="hidden items-center justify-center border-l border-stone-200 bg-stone-100 lg:flex">
        <TicketVenta />
      </div>
    </main>
  );
}
