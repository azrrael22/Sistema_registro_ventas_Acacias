export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl" aria-hidden>🌳</p>
          <h1 className="mt-2 text-xl font-semibold">Ventas Las Acacias</h1>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
