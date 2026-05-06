# Prime Padel — ERP de Inventario

Mini-ERP web para el control de inventario, compras, ventas y traslados del club **Prime Padel** (Cali, Colombia).

> Documentación técnica viva del sistema. El manual de usuario final (no técnico) está en [`docs/manual-usuario.md`](docs/manual-usuario.md) y la guía extendida del rol Maestro en [`docs/manual-maestro.md`](docs/manual-maestro.md).

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
12. [Seguridad](#seguridad)
13. [Carga masiva por CSV](#carga-masiva-por-csv)
14. [Descarga de transacciones a CSV](#descarga-de-transacciones-a-csv)
15. [Migraciones SQL](#migraciones-sql)

---

## Resumen del producto

Prime Padel es un club con 5 canchas de pádel, 2 de vóley playa, barbería, sala VIP, tienda de bebidas/aperitivos y restaurantes concesionados. Maneja inventario de bebidas alcohólicas y no alcohólicas, mecato, bolas de pádel y artículos deportivos, distribuido en varias ubicaciones físicas (bodegas, nevera, barra, vitrina).

El ERP permite:

- Visualizar y administrar el inventario total y por ubicación.
- Registrar **ventas, compras y traslados** entre ubicaciones, con descuento/aumento atómico de stock.
- Cargar transacciones masivamente por CSV y descargar reportes por rango de fechas.
- Calcular margen real de ventas (costo y precio se almacenan por separado al momento de la transacción).
- Analizar tendencias con un dashboard de KPIs, gráficas, top productos y alertas de stock bajo.
- Separar accesos en tres niveles de rol con jerarquía.

## Estado actual

**Fase:** Versión completa — entregada al cliente.
**Fecha de entrega:** 2026-04-25.
**URL producción:** https://erp-prime-padel.vercel.app/

Funcionalidades operativas:

- [x] Auth con login por usuario (no email) y middleware de rutas.
- [x] Tres roles con jerarquía: **maestro / admin / recepción**.
- [x] Gestión de usuarios desde `/usuarios` (crear, editar, reset password, desactivar, cambiar rol).
- [x] Permisos por rol validados en cada server action (no solo en UI).
- [x] Inventario: CRUD productos/servicios, filtros multi-select + paginación, ficha de detalle con stock por ubicación, histórico mensual, ajustes auditados.
- [x] Ajuste de inventario con detección de diferencias y registro en `ajustes_inventario`.
- [x] Transacciones: ventas, compras y traslados con multi-item, validación de stock, reversa automática al eliminar/editar.
- [x] **Costo y precio separados por ítem** — snapshot histórico, permite calcular margen real de ventas.
- [x] Edición de transacciones con rollback automático si la nueva versión falla.
- [x] Carga masiva de transacciones por CSV (DD/MM/AAAA, preview, validación, agrupación por ticket).
- [x] **Descarga de transacciones a CSV** por rango de fechas, dos modos (resumen por ítem con margen / historial por transacción).
- [x] Dashboard con pestañas Ventas / Inventario / Alertas, KPIs, filtros por mes y categoría, top productos, gráfica apilada por día de la semana, alertas detalladas con desglose por ubicación, días estimados de stock (predictivo).
- [x] Listas de precios: CRUD para gestionar canales y profesores externos.
- [x] Categorías y ubicaciones con CRUD y soft-delete cuando hay datos asociados.
- [x] Responsive con hamburger menu en móvil.
- [x] **RLS habilitado** en todas las tablas del dominio (acceso solo vía server con service_role).
- [x] 145 productos migrados desde Alegra + 8 meses de histórico de ventas.
- [x] 5 cuentas creadas: 2 maestros (CesarC, maestro), 1 admin, 2 recepción.

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
- **Row Level Security (RLS)** habilitado: el cliente no puede consultar BD directamente con la `publishable_key`. Todo pasa por server con `service_role_key`.

```
Navegador  ─►  Next.js (Vercel)  ─►  Supabase Postgres
                   │
                   └── Server Actions / Route Handlers (con service_role_key)
```

## Modelo de datos

Schema completo en [`supabase/schema.sql`](supabase/schema.sql). Resumen:

- `categorias`, `impuestos`, `listas_precios`, `ubicaciones` — catálogos maestros.
- `productos` — catálogo de productos y servicios. Distinción `tipo` (producto/servicio) y `es_inventariable`.
- `precios_producto` — N–N entre productos y listas de precios (un producto puede tener distintos precios según el canal).
- `stock_por_ubicacion` — cantidad por (producto, ubicación). PK compuesta. **Fuente de verdad** del inventario.
- `transacciones` — compra | venta | traslado. Header con tipo, fecha, total, usuario, notas, origen.
- `transaccion_items` — líneas de cada transacción. Incluye `precio_unitario` Y `costo_unitario` (snapshot histórico al momento de la transacción).
- `ajustes_inventario` — auditoría de ajustes manuales (conteo físico, mermas, roturas, correcciones).
- `ventas_historicas_mensuales` — agregados mensuales importados desde Alegra (sep 2025 – abr 2026).
- `perfiles` — vinculado a `auth.users`. Rol: `maestro | admin | recepcion`.

### Funciones RPC (atómicas)
- `registrar_transaccion(p_tipo, p_fecha, p_usuario, p_notas, p_origen, p_items jsonb)` — crea transacción + items, ajusta stock según tipo, bloquea si stock insuficiente.
- `registrar_ajuste_inventario(p_producto, p_ubicacion, p_cantidad_nueva, p_motivo, p_notas, p_usuario)` — setea stock absoluto y deja auditoría.

## Módulos funcionales

### Inventario
- Tabla paginada con búsqueda y filtros **multi-select** por categoría, ubicación, producto; filtro por rango de cantidad.
- CRUD productos/servicios con confirmación.
- Ficha de detalle con stock por ubicación, histórico mensual y botón de ajuste.

### Transacciones
- Registro individual de ventas, compras y traslados desde formulario con multi-item.
- En **ventas** se piden Costo y Precio por separado (margen calculable). En compra/traslado se pide solo costo.
- Carga masiva por **CSV** con preview + validación antes de confirmar.
- Editar y eliminar transacciones según rol (recepción solo sus propias del día).
- Descarga CSV por rango de fechas en dos modos.
- Filtros multi-select por categoría, producto, rango de fechas, tipo.

### Dashboard (solo Maestro)
Filtros globales: mes, rango de fechas, categoría, ubicación (multi-select).

- **Inventario actual:** cantidades, valor en pesos, distribución por ubicación.
- **Consumo:** $ por mes, cantidades por mes.
- **Top productos:** último mes, histórico, por día de la semana.
- **Alertas:** productos por acabarse en nevera, en bodegas, sin movimiento.
- **KPIs:** ticket promedio, rotación, días estimados de stock.

### Usuarios (solo Maestro)
CRUD, reset de password, cambio de rol, desactivación. Nombres de usuario internos (no email) traducidos a emails sintéticos en `@primepadel.local`.

## Paleta visual y marca

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo / texto principal | Negro | `#0A0A0A` |
| Superficie | Blanco | `#FFFFFF` |
| Gris logo | Gris claro | `#E5E5E5` |
| Acento logo | Amarillo Prime | `#F5C518` |
| Acento secundario | Naranja pastel | `#FFB366` |
| CTA / hover | Naranja vivo | `#FF8C42` |

Logo en `public/logo.png`. Fuente: Inter / Geist.

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
3. Variables de entorno configuradas en Vercel Dashboard (incluida la `SUPABASE_SERVICE_ROLE_KEY`).

## Roles y permisos

Jerarquía: `recepcion (1) < admin (2) < maestro (3)`. Definida en [`lib/auth.ts`](lib/auth.ts).

| Acción | Maestro | Admin | Recepción |
|--------|:-------:|:-----:|:---------:|
| Registrar venta / traslado | ✅ | ✅ | ✅ |
| Registrar compra | ✅ | ✅ | ❌ |
| Editar / eliminar transacciones | ✅ todo | ✅ excepto del Maestro | ✅ solo las suyas del día |
| Carga masiva CSV | ✅ | ✅ | ✅ (solo ventas/traslados) |
| Descarga CSV de transacciones | ✅ | ✅ | ❌ |
| Ver inventario | ✅ | ✅ | ❌ |
| CRUD productos | ✅ | ✅ | ❌ |
| Editar costos y precios | ✅ | ❌ | ❌ |
| Eliminar productos | ✅ | ❌ | ❌ |
| Ajuste de inventario | ✅ | ✅ | ❌ |
| CRUD ubicaciones | ✅ | ✅ | ❌ |
| CRUD categorías / listas de precios | ✅ | ❌ | ❌ |
| Ver Dashboard | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |

La validación de rol se hace SIEMPRE en server actions (`requireProfile`, `requireAdmin`, `requireMaestro`), no solo escondiendo botones en la UI.

## Seguridad

- **RLS activo** en todas las tablas del dominio (ver [`supabase/rls.sql`](supabase/rls.sql)). Sin políticas → la API REST con la `publishable_key` devuelve 0 filas. El cliente no puede consultar BD directamente.
- **`service_role_key`** solo en variables de entorno server-side. El único módulo que la usa (`lib/supabase/admin-server.ts`) tiene `import "server-only"` para que el bundler de Next.js falle si alguien intenta importarla desde un componente cliente.
- **RBAC** validado en backend por cada operación sensible (delete, edit, export, gestión de usuarios).
- **Backups**: Supabase hace snapshots automáticos diarios.

## Carga masiva por CSV

Flujo: subir archivo → parsear con Papa Parse → validar con Zod → mostrar preview con errores resaltados → el usuario confirma → inserción transaccional en BD vía RPC `registrar_transaccion`.

Formato esperado:

```csv
fecha,tipo,codigo_producto,ubicacion,cantidad,precio_unitario,notas,ticket
20/04/2026,venta,CERV-001,Barra,2,8000,,T-001
20/04/2026,compra,CERV-001,Bodega Principal,24,5500,Pedido proveedor,
```

- `fecha` en formato `DD/MM/AAAA`.
- `tipo` solo acepta `venta` o `compra` (los traslados se hacen vía formulario).
- `ticket` (opcional) agrupa varios ítems en una sola transacción.
- `costo_unitario` se backfillea automáticamente: en compras coincide con `precio_unitario`; en ventas se usa el costo actual del producto en el catálogo.

## Descarga de transacciones a CSV

Botón en `/transacciones` (solo admin/maestro). Dos modos:

- **Resumen por ítem** — agregado por (producto, tipo). Máx 2 filas por producto: una `venta` (consumo) y una `compra`. Trae cantidad total, valor total, costo total, **margen total y porcentual** (solo en ventas), precio promedio, número de transacciones y rango de fechas. Los traslados se excluyen.
- **Historial por transacción** — una fila por transacción, incluyendo traslados. Útil para listado completo de operaciones.

Validaciones: rango ≤ 2 años, fechas válidas, fecha inicial ≤ final. Salida en UTF-8 con BOM (Excel en Windows abre acentos correctamente).

## Migraciones SQL

Los cambios de schema viven en archivos numerados/descriptivos en [`supabase/`](supabase/) y se ejecutan **manualmente** en el SQL Editor de Supabase (en orden):

1. `schema.sql` — instalación inicial completa. **Recrea** todas las tablas (DROP CASCADE), úsalo solo en setup desde cero.
2. `rls.sql` — habilita RLS en todas las tablas del dominio. Idempotente.
3. `migration-costo-unitario.sql` — añade columna `costo_unitario` a `transaccion_items` con backfill + recrea el RPC para aceptarla. Idempotente.

Para futuras migraciones: crear un nuevo archivo `migration-<descripcion>.sql` en `supabase/`, idempotente (con `IF NOT EXISTS` o `IF EXISTS`), y mantener `schema.sql` actualizado para reflejar el modelo final.
