-- Foto de cada producto. La app convierte cualquier imagen a WebP antes de subirla
-- y el bucket solo acepta image/webp, así que en Storage solo hay archivos .webp.

-- Ruta dentro del bucket 'productos': '<id del producto>/<marca de tiempo>.webp'.
-- Cada foto nueva lleva otro nombre para que ningún caché muestre la anterior.
alter table productos add column foto text check (foto ~ ('^' || id || '/[0-9]+\.webp$'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 1048576, array['image/webp']);

-- Mismo criterio que la política prod_update: admin, quien creó el producto o un socio
create function puede_editar_producto(p_producto bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select es_admin() or (es_activo() and exists (
    select 1 from productos p
    where p.id = p_producto and (p.creado_por = auth.uid() or es_socio_producto(auth.uid(), p.id))
  ));
$$;

-- La carpeta de cada foto es el id de su producto. La lectura es pública (bucket público);
-- la API de Storage pide permiso de select para poder borrar.
create policy prod_foto_read on storage.objects for select to authenticated
  using (bucket_id = 'productos');
create policy prod_foto_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.puede_editar_producto((storage.foldername(name))[1]::bigint));
create policy prod_foto_delete on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.puede_editar_producto((storage.foldername(name))[1]::bigint));

revoke all on function puede_editar_producto(bigint) from anon, public;
grant execute on function puede_editar_producto(bigint) to authenticated;
