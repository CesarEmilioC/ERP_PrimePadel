# CLAUDE.md — Prime Padel ERP

Guía de contexto para que el asistente (Claude) trabaje eficiente en este repo sin re-descubrir información en cada sesión.

## 1. Qué es este proyecto

Mini-ERP web para **Prime Padel** (club de pádel en Cali, Colombia). Controla inventario y transacciones (compras/ventas) de bebidas, mecato, bolas de pádel y otros productos del club. Usado por cajeros y administradores.

Alcance: **MVP en 1 semana – 1.5 semanas** (mayo 2026 operativo).

## 2. Stack y servicios

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Gráficas:** Recharts
- **Tablas:** TanStack Table
- **CSV:** Papa Parse
- **Validación:** Zod
- **BD + Auth:** Supabase (Postgres)
- **Hosting:** Vercel
- **Package manager:** pnpm (preferido) o npm

## 3. Paleta de marca

Tomada de los logos en `others/`:

- **Negro:** `#0A0A0A` (fondo principal / texto)
- **Blanco:** `#FFFFFF`
- **Gris claro (logo):** `#E5E5E5`
- **Amarillo Prime (acento del logo):** `#F5C518`
- **Naranja pastel (uso frecuente del club):** `#FFB366`
- **Naranja vivo (hover/CTA):** `#FF8C42`

Fuente sugerida: Inter o Geist.

## 4. Estructura de carpetas (actual)

```
/app                # rutas Next.js (App Router)
  /inventario
  /transacciones
  /dashboard
  /login
/components         # UI reutilizable (nav, etc.)
/lib
  /supabase         # clients browser / server / admin
  /validators       # esquemas zod (producto, transaccion, ajuste...)
  utils.ts          # formatCOP, formatInt, formatDate, cn
/types              # tipos TS del dominio
/scripts            # migraciones (catálogo, histórico) y utilitarios
  /lib              # normalize.mjs, supabase.mjs
/supabase           # schema.sql, seed.sql
/public             # logo y assets
/others             # material del cliente (NO desplegar, en .gitignore)
/oldDatabase        # CSV + xlsx originales del cliente (NO desplegar)
/docs               # manual de usuario, cotización
```

## 5. Modelo de datos (v2 — definitivo, alineado a `supabase/schema.sql`)

- `categorias` — id, nombre (único), descripcion, orden, activa. Normalizadas desde el CSV original (elimina duplicados como "2 bebidas gaseosas" vs "21 Bebidas Gaseosas y Energizantes").
- `impuestos` — catálogo de impuestos (IVA 19%, Impoconsumo 8%, Sin impuesto). Solo informativo en la UI.
- `listas_precios` — tipos de cliente/canal (Detal, Equipo Prime, Kevin García, Bryan Perafán, Alterno 1-8). `DETAL` es la default.
- `ubicaciones` — id, nombre, tipo (bodega | nevera | barra | vitrina | oficina | otro), orden, activa. CRUD desde `/ubicaciones`.
- `productos` — id, codigo (SKU), nombre, **tipo** (`producto` | `servicio`), categoria_id, **es_inventariable**, costo_unitario, stock_minimo_alerta, impuesto_id, unidad_medida, descripcion_larga, ref_fabrica, codigo_barras, marca, modelo, visible_en_factura, activo. Los servicios no tienen stock.
- `precios_producto` — tabla N–N entre productos y listas_precios: (producto_id, lista_precio_id, precio). Permite múltiples precios por producto según el canal.
- `stock_por_ubicacion` — (producto_id, ubicacion_id, cantidad) PK compuesta. **Fuente de verdad**: cantidad total = SUM.
- `v_stock_total` (vista) — cantidad_total, valor_total_costo, estado_stock (`ok` | `stock_bajo` | `sin_stock`).
- `transacciones` — id, tipo (`compra` | `venta` | `traslado`), fecha, usuario_id, total, notas, origen (`manual` | `csv` | `api` | `migracion`).
- `transaccion_items` — transaccion_id, producto_id, **ubicacion_origen_id** (venta/traslado), **ubicacion_destino_id** (compra/traslado), cantidad, precio_unitario, subtotal, lista_precio_id.
- `ajustes_inventario` — auditoría de ajustes manuales de stock (conteo físico, mermas, roturas, correcciones, ingreso inicial).
- `ventas_historicas_mensuales` — (producto_id, anio, mes) PK. Agregados mensuales importados del reporte de Alegra. El dashboard une esta tabla con `transacciones` para cubrir histórico + operación diaria.
- `perfiles` — vinculado a `auth.users`; rol (admin | cajero), activo.

### Funciones RPC (atómicas)
- **`registrar_transaccion(p_tipo, p_fecha, p_usuario, p_notas, p_origen, p_items jsonb) → uuid`** — crea transacción + items; ajusta stock según tipo; bloquea venta/traslado si stock insuficiente; ignora stock para productos no inventariables.
- **`registrar_ajuste_inventario(p_producto, p_ubicacion, p_cantidad_nueva, p_motivo, p_notas, p_usuario) → uuid`** — setea stock absoluto en una ubicación y deja auditoría en `ajustes_inventario`.

### Regla de conciliación física (UX de inventario)
La fuente de verdad es `stock_por_ubicacion`. El módulo de inventario muestra:
1. Cantidad por ubicación (editable vía "Ajuste de inventario").
2. Cantidad total (SUM).
3. Discrepancias entre el stock esperado (antes + compras − ventas desde último ajuste) y el conteo físico. Si hay diferencia se pide motivo (`merma` | `rotura` | `correccion` | `conteo_fisico`) y queda registro en `ajustes_inventario`.

## 6. Funcionalidades del MVP

- **Inventario:** listar, crear, editar, eliminar (con confirmación). Filtros multi-select por categoría, ubicación, producto; filtro de rango de cantidad.
- **Transacciones:** registro individual (compra/venta) o carga CSV masiva con preview + validación. Editar y eliminar (admin).
- **Dashboard (por pestañas):** inventario actual, consumo $ por mes, consumo cantidades por mes, top productos mes/histórico, top por día de semana, alertas stock bajo (nevera / bodegas). Filtros globales (mes, rango de fechas, categoría, ubicación) con multi-select. Paginación dentro de gráficas grandes. Leyendas colapsables tras botón.
- **Auth + RBAC (fase final):** admin ve todo; cajero no accede a dashboard ni elimina.

## 7. Convenciones de código

- Server Components por defecto; `"use client"` solo cuando haga falta estado/efectos/eventos.
- Tipos compartidos en `/types`; nunca `any`.
- Todas las escrituras a BD pasan por server actions o route handlers, nunca desde el cliente con la key.
- Formato moneda COP sin decimales (`Intl.NumberFormat('es-CO')`).
- Fechas: guardar en UTC (`timestamptz`), mostrar en `America/Bogota`.
- Commits: convencionales (`feat:`, `fix:`, `chore:`).

## 8. Seguridad

- La key pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) va en cliente; está bien.
- La **service role key** solo en Vercel env vars server-side — **NUNCA** en el repo ni en el chat.
- Habilitar **Row Level Security (RLS)** en todas las tablas antes de producción.

## 9. Estado del proyecto

Ver `README.md` sección "Estado actual" — mantenerla al día cada sesión.

## 10. Cómo trabajar con este repo (para Claude)

- Antes de crear código nuevo, revisar si ya existe algo parecido.
- No añadir abstracciones prematuras; el cliente pidió MVP.
- No crear documentación extra salvo la pedida (`README.md`, manual de usuario, cotización).
- No hacer `git push`, `git commit`, ni desplegar sin confirmación explícita.
- Los CSVs reales llegarán del cliente — **no inventar schema** hasta verlos; la propuesta actual es tentativa.
- Idioma de UI y documentos de cara al cliente: **español**. Código y comentarios técnicos: inglés o español consistente en el archivo.
