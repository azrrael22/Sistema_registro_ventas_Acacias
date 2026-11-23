import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rutaInterna } from "@/lib/rutas";

// /restablecer no va aquí: necesita la sesión que abre el enlace del correo de recuperación
const RUTAS_PUBLICAS = ["/login", "/registro", "/recuperar", "/auth"];

// Ruta (con su query) a la que iba alguien sin sesión, para volver ahí después de ingresar: por
// ejemplo, el enlace de un correo. Sin el _rsc que agregan las navegaciones de Next.
function destinoDe({ pathname, search }: { pathname: string; search: string }) {
  if (pathname === "/") return null;
  const query = new URLSearchParams(search);
  query.delete("_rsc");
  const resto = query.toString();
  return resto ? `${pathname}?${resto}` : pathname;
}

// Refresca la sesión en cada request y manda a /login a quien no la tenga.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims().
  const { data } = await supabase.auth.getClaims();
  const conSesion = !!data?.claims;
  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((r) => ruta.startsWith(r));

  // La redirección lleva las cookies que haya renovado o borrado getClaims(); si no, se perderían
  const redirigir = (url: Parameters<typeof NextResponse.redirect>[0]) => {
    const redireccion = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
    return redireccion;
  };

  if (!conSesion && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const destino = destinoDe(request.nextUrl);
    if (destino) url.searchParams.set("destino", destino);
    return redirigir(url);
  }
  if (conSesion && (ruta === "/login" || ruta === "/registro")) {
    // Quien ya ingresó (en otra pestaña, por ejemplo) sigue hacia donde iba
    return redirigir(new URL(rutaInterna(request.nextUrl.searchParams.get("destino")) ?? "/", request.url));
  }

  return response;
}
