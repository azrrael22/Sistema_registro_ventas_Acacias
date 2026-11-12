-- Catálogo inicial (ver Productos.md).
-- Los precios no se conocen todavía: los productos quedan inactivos y en $0
-- hasta que un admin o socio les asigne precio y los active desde la app.

insert into categorias (nombre) values
  ('Pines y llaveros'), ('Artesanal'), ('Repelentes'), ('Cold brew'), ('Alfajores'), ('Camisetas');

insert into productos (categoria_id, nombre, precio, activo)
select c.id, p.nombre, 0, false
from (values
  ('Pines y llaveros', 'Pin'),
  ('Pines y llaveros', 'Llavero'),
  ('Artesanal',        'Llaveros'),
  ('Artesanal',        'Cucharas'),
  ('Artesanal',        'Lápices'),
  ('Artesanal',        'Lapiceros'),
  ('Repelentes',       'Repelente'),
  ('Cold brew',        'Cold brew'),
  ('Alfajores',        'Alfajor'),
  ('Camisetas',        'Camiseta')
) as p(categoria, nombre)
join categorias c on c.nombre = p.categoria;
