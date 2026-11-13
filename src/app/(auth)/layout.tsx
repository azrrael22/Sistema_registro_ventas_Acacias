import { Marca } from "@/components/marca";
import { TicketVenta } from "./ticket-venta";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 dark:bg-stone-900 lg:bg-white lg:px-16 lg:dark:bg-stone-900">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <Marca className="size-10" />
            <h1 className="mt-4 text-2xl font-medium text-stone-900 dark:text-stone-50">Ventas Las Acacias</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Registro de ventas de los empleados</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800 lg:border-0 lg:p-0 lg:shadow-none lg:dark:bg-transparent">{children}</div>
        </div>
      </div>
      <div className="hidden flex-col items-center justify-center gap-10 bg-emerald-800 lg:flex">
        <div className="text-center">
          <p className="text-sm font-medium text-emerald-100">Sistema de ventas</p>
          <p className="mt-0.5 text-xs text-emerald-400">Las Acacias · Registro de empleados</p>
        </div>
        <TicketVenta />
      </div>
    </main>
  );
}
