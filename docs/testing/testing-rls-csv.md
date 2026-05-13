# Testing — RLS + Descarga CSV + Costo/Precio en transacciones

Checklist para verificar tres cosas:

1. **Que activar RLS no rompió nada** del flujo normal del sistema.
2. **Que la descarga CSV de transacciones** funciona en sus dos modos y respeta los permisos por rol.
3. **Que la separación costo / precio en transacciones** funciona: se guarda snapshot histórico, se respeta al editar y aparece el margen en el CSV.

> ⚠️ **Antes de empezar:** ejecuta en Supabase SQL Editor los archivos en este orden:
> 1. `supabase/rls.sql` (si no se ejecutó antes)
> 2. `supabase/migration-costo-unitario.sql`

**URL:** https://erp-prime-padel.vercel.app/

**Cuentas:**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `maestro` | `MaestroPP2026` | Maestro |
| `admin` | `AdminPP2026` | Admin |
| `recepcion1` | `RecepcionPP1` | Recepción |

> Nota: estos tests asumen que ya pasaste el [testing.md](./testing.md) base (login, navegación, roles). Aquí solo cubrimos lo nuevo.

---

## A. Verificación de regresión por RLS

Si RLS rompiera algo, lo más probable es que veas listas vacías o errores de permisos al cargar páginas. Las consultas ahora pasan por server (con service_role, que bypasea RLS), así que **no debería haber cambios visibles**.

### A.1 Smoke test rápido como Maestro
- [ ] Login con `maestro` → home carga con saludo y tarjetas de resumen (no en blanco).
- [ ] Abre `/inventario` → la lista de productos aparece (no vacía).
- [ ] Abre `/transacciones` → aparecen las últimas 200 transacciones.
- [ ] Abre `/dashboard` → las gráficas cargan con datos.
- [ ] Abre `/usuarios` → ves a los 5 usuarios.
- [ ] Abre `/categorias`, `/ubicaciones`, `/listas-precios` → CRUD funciona normal.

### A.2 Smoke test como Admin
- [ ] Login con `admin` → home carga.
- [ ] `/inventario`, `/transacciones`, `/categorias`, `/ubicaciones` cargan.
- [ ] `/dashboard` redirige a home (no es admin).

### A.3 Smoke test como Recepción
- [ ] Login con `recepcion1` → home carga.
- [ ] `/transacciones` carga y muestra solo ventas/traslados (sin compras).
- [ ] `/inventario` redirige (recepción no ve inventario).

### A.4 Operaciones con escritura
- [ ] Como `maestro`, registra una venta de prueba → se guarda y aparece en la lista.
- [ ] Como `admin`, registra una compra de prueba → stock se incrementa correctamente.
- [ ] Como `recepcion1`, registra una venta → queda guardada con su usuario.
- [ ] Borra la venta de prueba como `maestro` → stock se revierte.

> Si todo lo anterior pasa, RLS no afectó al sistema. Toda la app sigue funcionando porque las consultas usan el cliente con `service_role` que bypasea RLS por diseño.

### A.5 Verificar que RLS sí bloquea acceso directo (opcional, técnico)

Esta prueba confirma que RLS está activo y protegiendo la API REST contra accesos directos con la key pública:

- [ ] En el navegador (logueado como cualquier rol), abre **DevTools → Console** y pega:
  ```js
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vtjkyuczfkgfxfsdffev.supabase.co";
  fetch(`${url}/rest/v1/transacciones?select=*`, {
    headers: { apikey: "TU_PUBLISHABLE_KEY", Authorization: "Bearer TU_PUBLISHABLE_KEY" }
  }).then(r => r.json()).then(console.log);
  ```
- [ ] Resultado esperado: array vacío `[]` (RLS bloqueando). Si devuelve datos, RLS NO está activado correctamente — avisar.

---

## B. Descarga CSV de transacciones

### B.1 Visibilidad del botón por rol
- [ ] Login con `maestro` → en `/transacciones` aparece el botón **"⬇ Descargar CSV"** arriba a la derecha.
- [ ] Login con `admin` → el botón también aparece.
- [ ] Login con `recepcion1` → el botón **NO** aparece.

### B.2 Descarga modo "Resumen por ítem"
Login como `maestro` o `admin`:
- [ ] Click en **"⬇ Descargar CSV"** → abre un dialog.
- [ ] Por defecto está seleccionado **"Resumen por ítem"** y las fechas son del mes actual.
- [ ] Click en **Descargar** → se baja un archivo `transacciones_por_item_YYYY-MM-DD_YYYY-MM-DD.csv`.
- [ ] Abre el archivo en Excel → se ven las columnas: `tipo, codigo_producto, producto, categoria, cantidad_total, valor_total, costo_total, margen_total, margen_pct, precio_promedio, num_transacciones, primera_fecha, ultima_fecha`.
- [ ] En filas de `venta`: `margen_total` y `margen_pct` están llenos. En filas de `compra`: están vacíos (no aplica).
- [ ] `margen_total = valor_total - costo_total`; `margen_pct = margen_total / valor_total × 100` (redondeado a 2 decimales).
- [ ] Acentos y ñ se ven correctamente (no aparecen como `Â`, `Ã±`, etc.).
- [ ] Hay máximo **2 filas por producto** (una `venta` y una `compra`). Si un producto solo tuvo ventas en el rango, solo aparece su fila `venta`.
- [ ] **Los traslados NO aparecen** en este reporte (son movimientos internos).
- [ ] `cantidad_total` y `valor_total` corresponden a la suma del producto en el rango; `precio_promedio = valor_total / cantidad_total`.

### B.3 Descarga modo "Por transacción"
- [ ] Vuelve a abrir el dialog y selecciona **"Historial por transacción"**.
- [ ] Click en **Descargar** → archivo `transacciones_por_transaccion_...csv`.
- [ ] Columnas: `fecha, tipo, num_items, cantidad_total, productos_resumen, total, usuario, notas, origen, transaccion_id`.
- [ ] Una fila por transacción.
- [ ] La columna `productos_resumen` muestra los primeros 5 productos separados por ` | `, y si hay más, agrega `(+N más)`.

### B.4 Validaciones
- [ ] Pon **fecha final ANTERIOR a fecha inicial** → al click Descargar, sale toast de error "La fecha inicial debe ser anterior o igual a la final".
- [ ] Pon un **rango mayor a 2 años** (ej. `2020-01-01` a `2026-12-31`) → toast de error "El rango no puede exceder 2 años".
- [ ] Pon un **rango sin transacciones** (ej. `2010-01-01` a `2010-01-31`) → la descarga funciona pero el CSV trae solo el header (sin filas).

### B.5 Permiso a nivel server (técnico)
- [ ] Login como `recepcion1`. Abre DevTools → Network. Aunque no veas el botón, intenta forzar la llamada a la server action (no es trivial sin código). **Resultado esperado:** la server action redirige a home con `?error=admin_requerido`. Esto confirma que la validación está en backend, no solo en UI.
- [ ] Alternativa más simple: como `recepcion1`, edita el HTML en DevTools para hacer aparecer el botón. Click → la respuesta del servidor falla con redirect.

### B.6 Caracteres especiales en notas/nombres
- [ ] Crea una transacción con nota `Pago en efectivo — cliente "Pérez"` (con guión largo, comillas, tilde).
- [ ] Descarga el CSV → la nota aparece correctamente, las comillas internas se escapan, y el archivo no se rompe.

---

---

## C. Costo / precio en transacciones (snapshot histórico + edición)

### C.1 Crear venta nueva
- [ ] Como `maestro` o `admin`, abrir Nueva transacción → tipo "Venta".
- [ ] Buscar y agregar un producto que tenga costo y precio definidos en catálogo.
- [ ] Verificar que aparece **una sola columna editable**: "Precio venta", pre-llenada con el precio Detal del catálogo (el costo NO se muestra).
- [ ] Modificar el precio si quieres, guardar la venta.
- [ ] En Supabase (o vía CSV "Resumen por ítem"), verificar que la fila guardada tiene `costo_unitario = costo del producto al momento de la venta` (snapshot automático).

### C.2 Editar venta — el costo se preserva
- [ ] Editar la venta recién creada → solo se ve "Precio venta", igual que al crear.
- [ ] Cambia el costo del producto en `/inventario` (ej. de 1000 a 1500).
- [ ] Vuelve a editar la venta → guarda sin tocar nada.
- [ ] En Supabase, verificar que `costo_unitario` de la venta SIGUE siendo 1000 (NO se refrescó al 1500 nuevo).

### C.3 Crear compra nueva
- [ ] Tipo "Compra" → aparece columna "Costo unitario" editable.
- [ ] Editar el costo del proveedor, guardar.

### C.4 Crear traslado nuevo
- [ ] Tipo "Traslado" → aparece columna "Costo unitario" editable, pre-llenada con el costo actual del producto.
- [ ] Guardar.

### C.5 Editar traslado/compra y NO modificar costo
- [ ] Editar un traslado o compra existente.
- [ ] Verificar que el "Costo unitario" aparece tal cual estaba (snapshot guardado), NO refrescado del producto actual.
- [ ] Guardar sin tocar el costo → el valor sigue igual al original.

### C.6 CSV import (carga masiva)
- [ ] Importar un CSV de ventas (sin columna costo en el CSV).
- [ ] En Supabase, verificar que las filas creadas tienen `costo_unitario = costo actual del producto` (snapshot best-effort).
- [ ] Importar un CSV de compras → `costo_unitario = precio_unitario` (mismo valor que el del CSV).

### C.7 Margen en CSV export
- [ ] Descargar CSV "Resumen por ítem" con un rango que incluya las ventas anteriores.
- [ ] Las filas de `venta` tienen `costo_total`, `margen_total` y `margen_pct` calculados con base en el costo guardado.
- [ ] Las filas de `compra` tienen `margen_total` y `margen_pct` vacíos (no aplica).

---

**Notas / observaciones:**
> 

---

**Estado al final:**
- [ ] Sección A completa — sin regresiones por RLS.
- [ ] Sección B completa — descarga CSV funciona en ambos modos y respeta permisos.
- [ ] Sección C completa — costo / precio se guardan, se respetan al editar y aparecen en CSV.
