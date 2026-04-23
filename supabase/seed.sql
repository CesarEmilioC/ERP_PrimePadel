-- ============================================================================
-- Prime Padel ERP — Seed (datos maestros iniciales)
-- ============================================================================
-- Ejecutar DESPUÉS de schema.sql. Idempotente (ON CONFLICT DO NOTHING).
-- Carga: impuestos, listas de precios y ubicaciones iniciales.
-- Las categorías y los productos se cargan con scripts/migrate-catalogo.mjs.
-- ============================================================================

-- Impuestos (observados en el CSV de Alegra)
insert into impuestos (codigo, nombre, tipo, porcentaje, codigo_origen) values
  ('IVA_19',         'IVA 19%',          'iva',         19.00, '1-IVA 19%'),
  ('IMPOCONSUMO_8',  'Impoconsumo 8%',   'impoconsumo',  8.00, '16-Impoconsumo 8%'),
  ('NINGUNO',        'Sin impuesto',     'ninguno',      0.00, null)
on conflict (codigo) do nothing;

-- Listas de precios (tipos de cliente / canales)
-- Derivadas de los nombres de columna del CSV original.
insert into listas_precios (codigo, nombre, descripcion, es_default, orden) values
  ('DETAL',         'Detal consumidor final', 'Precio regular al cliente final',            true,  1),
  ('EQUIPO_PRIME',  'Equipo Prime JSDM',      'Precio interno para equipo y entrenadores',  false, 2),
  ('KEVIN_GARCIA',  'Profesor Kevin García',  'Precio especial para clases con Kevin',      false, 3),
  ('BRYAN_PERAFAN', 'Profesor Bryan Perafán', 'Precio especial para clases con Bryan',      false, 4),
  ('ALTERNO_1',     'Precio alterno 1',       'Columna adicional de lista Alegra',          false, 5),
  ('ALTERNO_2',     'Precio alterno 2',       'Columna adicional de lista Alegra',          false, 6),
  ('ALTERNO_3',     'Precio alterno 3',       'Columna adicional de lista Alegra',          false, 7),
  ('ALTERNO_4',     'Precio alterno 4',       'Columna adicional de lista Alegra',          false, 8),
  ('ALTERNO_5',     'Precio alterno 5',       'Columna adicional de lista Alegra',          false, 9),
  ('ALTERNO_6',     'Precio alterno 6',       'Columna adicional de lista Alegra',          false, 10),
  ('ALTERNO_7',     'Precio alterno 7',       'Columna adicional de lista Alegra',          false, 11),
  ('ALTERNO_8',     'Precio alterno 8',       'Columna adicional de lista Alegra',          false, 12)
on conflict (codigo) do nothing;

-- Ubicaciones físicas iniciales (ordenadas por flujo operativo)
insert into ubicaciones (nombre, tipo, descripcion, orden) values
  ('Bodega Principal', 'bodega',   'Almacén central de reposición',                        1),
  ('Nevera Barra',     'nevera',   'Nevera de la barra principal (bebidas frías)',         2),
  ('Nevera Cajero',    'nevera',   'Nevera ubicada en la zona del cajero',                 3),
  ('Barra Cajero',     'barra',    'Stock a la mano del cajero (no refrigerado)',          4),
  ('Vitrina',          'vitrina',  'Vitrina de exhibición de productos',                   5),
  ('Oficina',          'oficina',  'Stock administrativo / regalos / muestras',            6),
  ('Otro',             'otro',     'Ubicación genérica para casos no previstos',           7)
on conflict (nombre) do nothing;
