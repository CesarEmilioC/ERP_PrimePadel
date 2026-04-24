# Prime Padel — ERP de Inventario

Mini-ERP web para el control de inventario, compras y ventas del club **Prime Padel** (Cali, Colombia).

> Este documento es la **documentación técnica viva** del sistema. Se actualiza en cada iteración del desarrollo. El manual del usuario final (no técnico) vive en [`docs/manual-usuario.md`](docs/manual-usuario.md) (se genera al finalizar el MVP).

---

## Tabla de contenido

1. [Resumen del producto](#resumen-del-producto)
2. [Estado actual](#estado-actual)
3. [Stack tecnológico](#stack-tecnológico)
4. [Arquitectura](#arquitectura)
5. [Modelo de datos](#modelo-de-datos)
6. [Módulos funcionales](#módulos-funcionales)
7. [Paleta visual y marca](#paleta-visual-y-marca)
8. [Puesta en marcha local](#puesta-en-marcha-local)
9. [Variables de entorno](#variables-de-entorno)
10. [Despliegue](#despliegue)
11. [Roles y permisos](#roles-y-permisos)
12. [Carga masiva por CSV](#carga-masiva-por-csv)
13. [Plan de trabajo (1 semana)](#plan-de-trabajo-1-semana)
14. [Decisiones abiertas](#decisiones-abiertas)

---

## Resumen del producto

Prime Padel es un club con 5 canchas de pádel, 2 de vóley playa, barbería, sala VIP, tienda de bebidas/aperitivos y restaurantes concesionados. Maneja inventario de bebidas alcohólicas y no alcohólicas, mecato, bolas de pádel y artículos deportivos, distribuido en varias ubicaciones físicas (bodegas, nevera, barra, vitrina).

El ERP permite:

- Visualizar y administrar el inventario total y por ubicación.
- Registrar compras (ingresos de inventario) y ventas (egresos) de forma manual o masiva por CSV.
- Analizar tendencias de consumo con un dashboard de KPIs, gráficas y alertas.
- Separar accesos entre administradores y cajeros.

## Estado actual

**Fase:** 3 — **MVP funcional** listo para demo con el cliente.
**Fecha:** 2026-04-23.

Completado:

- [x] Proyecto Next.js 15 + Tailwind + Supabase + Vercel-ready.
- [x] Schema v2 aplicado, seed cargado (3 impuestos, 12 listas de precios, 7 ubicaciones).
- [x] 145 productos/servicios migrados + 14 servicios históricos inactivos.
- [x] 394 registros de ventas históricas (OCT 2025 – ABR 2026) en `ventas_historicas_mensuales`.
- [x] Componentes UI propios (Button, Dialog, MultiSelect, Table, Badge, Toast).
- [x] **Módulo Ubicaciones**: CRUD con protección de borrado.
- [x] **Módulo Categorías**: CRUD con conteo de productos asociados.
- [x] **Módulo Inventario**: lista con filtros multi-select, crear/editar/eliminar producto, vista de detalle con stock por ubicación, precios multi-lista, histórico mensual, ajustes auditados.
- [x] **Ajuste de inventario** con detección de diferencias y registro en `ajustes_inventario`.
- [x] **Módulo Transacciones**: registro manual de venta/compra multi-ítem, validación de stock, reversa automática al eliminar.
- [x] **Dashboard**: KPIs, gráfica de consumo mensual, top 10 productos, distribución por categoría, tendencia dual, filtros multi-select.
- [x] Home con KPIs en vivo.
- [x] Cotización actualizada con tabla MVP vs Completo ([docs/cotizacion.md](docs/cotizacion.md)).
- [x] Manual de usuario del MVP ([docs/manual-usuario.md](docs/manual-usuario.md)).
- [x] `pnpm typecheck` y `pnpm build` limpios.

Pendiente (Fase 2 — versión completa):

- [x] Login con Supabase Auth + roles (admin / cajero).
- [x] Middleware de protección de rutas.
- [x] Gestión de usuarios desde `/usuarios` (crear, reset password, desactivar, cambiar rol).
- [x] Permisos por rol en server actions (borrado restringido a admin, costos solo admin).
- [x] Leyendas del dashboard en lightbox modal.
- [x] Despliegue en Vercel.
- [ ] Carga masiva de transacciones por CSV (preview + validación + commit).
- [ ] Edición de transacciones existentes.
- [ ] Traslado de stock entre ubicaciones (RPC ya existe).
- [ ] Dashboard: gráficas por día de la semana, rotación de inventario, pestañas separadas.
- [ ] Importación del inventario inicial físico (cantidades por ubicación) — pendiente de recibir del cliente.

### Crear el primer administrador

Después de aplicar `schema.sql` en Supabase y antes del primer login, ejecuta:

```bash
node scripts/create-admin.mjs --email "tu@correo.com" --nombre "Tu Nombre" --password "claveSegura"
```

Si omites `--password`, el script genera una y la imprime. Una vez dentro, puedes crear/gestionar más usuarios desde `/usuarios`.

Pendiente:

- [ ] Módulo de inventario (CRUD + filtros).
- [ ] Módulo de transacciones (manual + CSV).
- [ ] Dashboard analítico.
- [ ] Autenticación y RBAC.
- [ ] Migración de datos reales (esperando CSV del cliente).
- [ ] Manual de usuario.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Gráficas | Recharts |
| Tablas | TanStack Table |
| Validación | Zod |
| CSV | Papa Parse |
| BD / Auth | Supabase (Postgres + Auth) |
| Hosting | Vercel |

## Arquitectura

- **Server Components** por defecto; cliente solo donde haya interactividad.
- Escrituras a BD a través de **Server Actions** o **Route Handlers**; nunca desde el navegador con claves.
- Lógica transaccional (ej. registrar venta + descontar stock) en **funciones RPC de Postgres** para garantizar atomicidad.
- **Row Level Security (RLS)** habilitado antes de producción.

```
Navegador  ─►  Next.js (Vercel)  ─►  Supabase Postgres
                   │
                   └── Server Actions / Route Handlers (con service role key)
```

## Modelo de datos

Propuesta inicial (se refina cuando llegue el CSV real del cliente):

- `categorias (id, nombre, tipo)`
- `ubicaciones (id, nombre, tipo)` — bodega / nevera / barra / vitrina
- `productos (id, sku, nombre, categoria_id, costo_unitario, precio_venta, stock_minimo_alerta, activo)`
- `stock_por_ubicacion (producto_id, ubicacion_id, cantidad)` — PK compuesta
- `transacciones (id, tipo, fecha, usuario_id, total, notas)` — tipo: compra | venta
- `transaccion_items (id, transaccion_id, producto_id, ubicacion_id, cantidad, precio_unitario, subtotal)`
- `perfiles (user_id, nombre, rol)` — rol: admin | cajero

Cantidad total de un producto = `SUM(stock_por_ubicacion.cantidad)`.

## Módulos funcionales

### Inventario
- Tabla paginada con búsqueda y filtros **multi-select** por: categoría, ubicación, producto; filtro por rango de cantidad.
- Crear, editar, eliminar (con confirmación modal).
- Vista de detalle por producto mostrando cantidades por ubicación.

### Transacciones
- Registro individual de compras y ventas desde formulario.
- Carga masiva por **CSV** con preview + validación antes de confirmar.
- Editar y eliminar transacciones (eliminar = solo admin).
- Filtros multi-select por categoría, ubicación, producto, rango de fechas, tipo.

### Dashboard (por pestañas)
Filtros globales: mes, rango de fechas, categoría, ubicación (multi-select).

- **Inventario actual:** cantidades, valor en pesos, distribución por ubicación.
- **Consumo:** $ por mes, cantidades por mes.
- **Top productos:** último mes, histórico, por día de la semana.
- **Alertas:** productos por acabarse en nevera, en bodegas, sin movimiento.
- **KPIs:** ticket promedio, rotación, margen estimado.

Las gráficas con muchas series usan **paginación interna** y las leyendas se abren desde un botón para no saturar la vista.

## Paleta visual y marca

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo / texto principal | Negro | `#0A0A0A` |
| Superficie | Blanco | `#FFFFFF` |
| Gris logo | Gris claro | `#E5E5E5` |
| Acento logo | Amarillo Prime | `#F5C518` |
| Acento secundario | Naranja pastel | `#FFB366` |
| CTA / hover | Naranja vivo | `#FF8C42` |

Logo en `public/logo.png` (copiar desde `others/logoPrime.png`). Aparece en el nav principal.

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env.local   # llenar con credenciales
pnpm dev
```

Requisitos: Node 20+, pnpm 9+, proyecto de Supabase creado.

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server-side; nunca commit
```

## Despliegue

1. Push a rama `main`.
2. Vercel auto-despliega.
3. Variables de entorno configuradas en Vercel Dashboard (incluida la service role key).

## Roles y permisos

| Acción | Admin | Cajero |
|--------|:-----:|:------:|
| Ver inventario | ✅ | ✅ |
| Crear / editar producto | ✅ | ✅ |
| Eliminar producto | ✅ | ❌ |
| Registrar venta / compra | ✅ | ✅ |
| Editar transacción | ✅ | ✅ (mismo día) |
| Eliminar transacción | ✅ | ❌ |
| Carga masiva CSV | ✅ | ✅ |
| Ver dashboard | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ |

## Carga masiva por CSV

Flujo: subir archivo → parsear con Papa Parse → validar con Zod → mostrar preview con errores resaltados → el usuario confirma → inserción transaccional en BD.

Formato esperado (se ajusta al CSV real del cliente cuando llegue):

```csv
fecha,tipo,producto_sku,ubicacion,cantidad,precio_unitario,notas
2026-04-20,venta,CERV-001,Barra,2,8000,
```

## Plan de trabajo (1 semana)

| Día | Foco |
|-----|------|
| 1 | Setup Next.js + Supabase + layout + esquema BD |
| 2 | CRUD inventario + filtros |
| 3 | Transacciones individuales + ajuste de stock |
| 4 | Carga CSV + migración de datos del cliente |
| 5 | Dashboard parte 1 (KPIs, consumo, tops) |
| 6 | Dashboard parte 2 (alertas, paginación, leyendas) |
| 7 | Auth + RBAC |
| 8 | QA y pulido |
| 9 | Despliegue final + smoke test con cliente |
| 10 | Manual de usuario + capacitación |

## Decisiones abiertas

- Schema final del CSV (pendiente del cliente).
- ¿El cajero puede eliminar transacciones del día? — propuesto: solo editar, no eliminar.
- SKU: ¿lo maneja el cliente o lo generamos nosotros? (`CAT-000X`).
- ¿Soporte post-entrega incluido o facturado aparte? — definir antes de firmar cotización.
