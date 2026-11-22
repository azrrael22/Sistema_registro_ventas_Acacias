-- Latido diario del Cron de Vercel (/api/latido): el plan gratuito de Supabase pausa el
-- proyecto tras 7 días sin actividad. Es la única función que puede llamar anon, porque el
-- cron no tiene sesión de usuario; no lee ni escribe ninguna tabla, solo devuelve la hora.
create function latido() returns timestamptz
language sql stable set search_path = public as $$ select now() $$;

revoke all on function latido() from public;
grant execute on function latido() to anon, authenticated;
