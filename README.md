# Sistema_registro_ventas_Acacias
Sistema para registrar las ventas de los productos que la empresa las Acacias permite que los empleados vendan.

Requisitos: [Acacias.md](Acacias.md) · Catálogo: [Productos.md](Productos.md)

## Tecnología

- **Next.js 16** (App Router, TypeScript, Tailwind) → se despliega en **Vercel**
- **Supabase**: base de datos Postgres, autenticación, tiempo real y Edge Functions
- **Resend** para los correos de notificación

Toda la seguridad vive en la base de datos (RLS + triggers + funciones), en
[supabase/migrations/](supabase/migrations/). La app solo muestra u oculta botones.

## Desarrollo local

Requiere Node 20+, Docker y la [CLI de Supabase](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start                 # levanta Supabase local y aplica las migraciones
cp .env.example .env.local     # pega la URL y la "Publishable key" que muestra `supabase status`
npm run dev                    # http://localhost:3000
```

1. Regístrate en `/registro`.
2. Hazte admin (solo la primera vez):
   ```bash
   docker exec supabase_db_Sistema_registro_ventas_Acacias psql -U postgres \
     -c "update empleados set es_admin = true, activo = true where email = 'TU_CORREO';"
   ```
3. Los correos locales (confirmación de cuenta) se ven en http://127.0.0.1:54324.

Otros comandos:

| Comando | Para qué |
|---|---|
| `supabase db reset` | Borra la base local y vuelve a aplicar las migraciones |
| `npm run db:types` | Regenera `src/lib/database.types.ts` después de cambiar el esquema |
| `docker exec -i supabase_db_Sistema_registro_ventas_Acacias psql -U postgres -q < supabase/tests/reglas_negocio.sql` | Prueba reglas de negocio y permisos |

Para cambiar el esquema crea una migración nueva (`supabase migration new nombre`); no edites las que ya se aplicaron en producción.

## Puesta en producción

### 1. Supabase (base de datos)

```bash
supabase login
supabase link --project-ref <REF>   # el REF está en la URL del dashboard: supabase.com/dashboard/project/<REF>
supabase db push                    # aplica las migraciones al proyecto real
```

Luego, en el dashboard → **SQL Editor**, después de registrarte en la app ya desplegada:

```sql
update empleados set es_admin = true, activo = true where email = 'TU_CORREO';
```

### 2. Vercel (la app)

1. Entra a [vercel.com](https://vercel.com) con tu cuenta de GitHub → **Add New → Project** → importa este repositorio.
2. En **Environment Variables** agrega:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase → Project Settings → API (Project URL)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → Supabase → Project Settings → API Keys (Publishable key)
3. **Deploy**. Cada push a `main` publica en producción; cada push a otra rama crea una vista previa.
4. En Supabase → **Authentication → URL Configuration**:
   - **Site URL**: la URL de Vercel (ej. `https://acacias-ventas.vercel.app`)
   - **Redirect URLs**: `https://acacias-ventas.vercel.app/**`

### 3. Correos (Resend)

1. Crea una cuenta en [resend.com](https://resend.com) y una API key.
   Sin dominio propio solo puedes enviar a tu propio correo (remitente `onboarding@resend.dev`);
   para enviar a todos los empleados verifica un dominio en Resend.
2. Sube la función y sus secretos:
   ```bash
   supabase functions deploy enviar-notificacion
   supabase secrets set RESEND_API_KEY=re_xxx WEBHOOK_SECRET=<una-clave-larga-inventada> \
     APP_URL=https://acacias-ventas.vercel.app CORREO_REMITENTE="Ventas Las Acacias <ventas@tudominio.com>"
   ```
3. Supabase → **Database → Webhooks → Create a new hook**:
   - Tabla `notificaciones`, evento **Insert**
   - Tipo **Supabase Edge Functions** → `enviar-notificacion`, método POST
   - HTTP Header: `x-webhook-secret` = el mismo `WEBHOOK_SECRET`

## Estructura

```
src/app/(auth)/          login, registro
src/app/(app)/           pantallas internas (vender, ventas, productos, inventario, retiros, reportes, notificaciones, admin)
src/lib/supabase/        clientes de Supabase (navegador, servidor, proxy)
src/proxy.ts             redirige a /login si no hay sesión
supabase/migrations/     esquema, RLS, triggers, RPCs y catálogo inicial
supabase/functions/      Edge Function de correos
supabase/tests/          prueba SQL de reglas de negocio
```
