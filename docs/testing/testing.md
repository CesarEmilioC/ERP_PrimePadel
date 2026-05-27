# Testing pre-entrega — ERP Prime Padel

Plan de pruebas **completo** para correr antes de entregar al cliente. Marca cada caso `- [x]` cuando funcione; si algo falla, anótalo debajo del check con el formato del final.

**URL:** https://erp-prime-padel.vercel.app/

**Cuentas:**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `CesarC` | `CesarPP2026` | Maestro |
| `maestro` | `MaestroPP2026` | Maestro |
| `admin` | `AdminPP2026` | Admin |
| `recepcion1` | `RecepcionPP1` | Recepción |
| `recepcion2` | `RecepcionPP2` | Recepción |

> **Tips:**
> - Usa una ventana normal y otra en **incógnito** para tener dos roles abiertos en paralelo.
> - Si vas a probar con datos limpios, primero corre `supabase/reset-operacion.sql` (deja stock y transacciones en cero, conserva el catálogo).
> - Antes de probar, asegúrate de haber ejecutado en Supabase, en orden: `schema.sql` (si aplica), `rls.sql`, `migration-costo-unitario.sql`, `migration-tarifas-descuento.sql`.

---

## 0. Preparación de datos para la prueba

Para probar bien necesitas algo de stock. Hazlo en este orden:

- [ ] Como `maestro`, registra **1 compra** de 3-4 productos (entra stock a Bodega Principal).
- [ ] Registra **1 traslado** de algunas unidades de Bodega → Barra/Nevera.
- [ ] Verifica que el stock se movió correctamente en la ficha de esos productos.

---

## 1. Login y seguridad de rutas

### 1.1 Acceso bloqueado sin sesión
- [ ] Abre el sitio en incógnito → te lleva a `/login`.
- [ ] Intenta abrir `/dashboard` directo → redirige a `/login?next=/dashboard`.
- [ ] Intenta `/inventario`, `/usuarios`, `/tarifas` sin sesión → todas redirigen a login.

### 1.2 Login válido / inválido
- [ ] Login `CesarC` / `CesarPP2026` → home con saludo y badge "MAESTRO".
- [ ] Password incorrecta → "Usuario o contraseña incorrectos".
- [ ] Usuario inexistente → mismo mensaje (no revela si existe).
- [ ] `CESARC` o ` cesarc ` (mayúsculas/espacios) → entra igual (case-insensitive).
- [ ] Logout desde el avatar → vuelve a `/login`.

**Notas:**
>

---

## 2. Rol Recepción (`recepcion1`)

### 2.1 Lo que NO debe ver
- [ ] Nav: solo "Transacciones".
- [ ] Forzar en URL `/dashboard`, `/inventario`, `/ubicaciones`, `/categorias`, `/tarifas`, `/usuarios` → todas redirigen.

### 2.2 Registrar venta
- [ ] "+ Nueva transacción" → solo aparece el botón **Venta** (no Compra ni Traslado).
- [ ] Buscar producto → agregarlo → el **Precio venta** se autocompleta con el Detal.
- [ ] El campo de cantidad permite borrar y reescribir; los montos muestran separadores de miles.
- [ ] Agregar el mismo producto dos veces con ubicaciones distintas → 2 líneas separadas.
- [ ] Registrar → toast verde "Venta registrada". Aparece en la lista con fecha/hora, "Registró: recepcion1", badge verde.
- [ ] **No** se pide costo en la venta (solo precio).

### 2.3 Editar/eliminar (restricciones de recepción)
- [ ] Editar su propia venta **de hoy** → permite. Cambiar cantidad y guardar → "Transacción actualizada".
- [ ] Eliminar su propia venta de hoy → confirma → desaparece y el stock se revierte.
- [ ] Login `recepcion2`: NO ve botones Editar/Eliminar en las ventas de `recepcion1`.

### 2.4 Filtros de la lista
- [ ] Filtros por categoría (multi) y producto (multi) funcionan.
- [ ] Filtro por rango de fechas funciona.
- [ ] Paginación: cambiar de página con flechas y escribiendo el número de página directamente.

**Notas:**
>

---

## 3. Rol Admin (`admin`)

### 3.1 Accesos
- [ ] Nav: Transacciones, Inventario, Ubicaciones (NO Dashboard, Categorías, Tarifas, Usuarios).
- [ ] Forzar `/dashboard`, `/usuarios`, `/tarifas`, `/categorias` → redirigen.

### 3.2 Transacciones (los 3 tipos)
- [ ] "+ Nueva transacción" → aparecen Venta / Compra / Traslado.
- [ ] **Compra**: producto + ubicación destino + cantidad + costo → guarda. La columna del valor dice "Costo unitario".
- [ ] **Traslado**: origen ≠ destino + cantidad → guarda. La fila muestra "origen → destino". El costo se prellena y es editable.
- [ ] Traslado con origen = destino → aviso rojo, no deja guardar.
- [ ] Venta de producto sin stock suficiente → aviso rojo, no deja guardar.
- [ ] Venta de un producto inventariable + un servicio en la misma transacción → ambos se registran; el servicio no descuenta stock.

### 3.3 Permisos de edición de Admin
- [ ] Editar/eliminar una transacción creada por `recepcion1` o por otro admin → permite (cualquier día).
- [ ] Intentar editar/eliminar una transacción creada por un **Maestro** → NO permite, mensaje claro.

### 3.4 Inventario
- [ ] `/inventario` muestra la lista con filtros (categoría, ubicación, producto, rango de cantidad) y paginación con input de página.
- [ ] "+ Nuevo ítem" → NO muestra "Costo unitario" ni "Precios por tarifa". Aparece aviso de que solo el Maestro los gestiona.
- [ ] Crear un producto sin precio → se crea OK.
- [ ] Ficha de producto: NO aparece botón "Eliminar" (solo Maestro).
- [ ] Hacer un ajuste de inventario → funciona.

### 3.5 Ubicaciones
- [ ] Crear una ubicación nueva → aparece en la lista.
- [ ] Click en el nombre de una ubicación (o botón "Ver") → abre la **ficha de la ubicación** con KPIs y tabla de productos presentes (cantidad > 0).
- [ ] Editar una ubicación.
- [ ] Borrar una ubicación sin movimientos → se borra. Con movimientos → se marca inactiva.

**Notas:**
>

---

## 4. Rol Maestro (`maestro` o `CesarC`)

### 4.1 Accesos
- [ ] Nav: los 6 links (Transacciones, Inventario, Ubicaciones, Dashboard, Categorías, Tarifas, Usuarios).
- [ ] Puede editar/eliminar transacciones de cualquier usuario y cualquier día.

### 4.2 Tarifas
- [ ] En `/tarifas` ves la lista con columna "Descuento %".
- [ ] Crear tarifa "Staff Prime Padel", código `STAFF_PRIME`, descuento `20`% → se crea.
- [ ] Editar Detal → el campo de descuento aparece bloqueado/avisado (Detal es base, 0%).
- [ ] Eliminar la tarifa Detal → NO se permite (mensaje claro).
- [ ] Eliminar una tarifa con precios asignados → se desactiva en vez de borrarse.

### 4.3 Precios por tarifa en un producto
- [ ] Edita un producto con precio Detal definido. En "Precios por tarifa" la fila de Staff Prime muestra `auto: <Detal − 20%>`.
- [ ] Escribe un precio manual en Staff Prime → se guarda. Al volver a abrir, ese precio aparece como "Manual".
- [ ] Borra el precio manual (déjalo en 0) → vuelve a calcular automático.
- [ ] Cambia el descuento de la tarifa al 25% → los productos sin precio manual reflejan el nuevo cálculo; los manuales no cambian.

### 4.4 Ficha de producto — costos e histórico
- [ ] Las 4 tarjetas de arriba muestran: Stock total, **Costo promedio** (de compras), **Última compra**, **Valor invertido**.
- [ ] Si el producto tiene compras, el costo promedio = promedio ponderado de esas compras (verifícalo con la tabla de histórico de transacciones abajo).
- [ ] "Stock por ubicación" muestra **solo** ubicaciones con cantidad > 0.
- [ ] "Histórico de transacciones" lista ventas/compras/traslados del producto, con paginación (flechas + número de página).
- [ ] "Histórico de ventas (mensual)" muestra los datos de Alegra, paginado.
- [ ] "Historial de ajustes" muestra los ajustes, paginado.

### 4.5 Dashboard — Ventas
- [ ] KPIs arriba (productos, ubicaciones, stock total, valor inventario, alertas).
- [ ] Filtros: Categoría (multi), **Mes** (atajo) y **Fecha desde/hasta**. Al elegir Mes se limpian las fechas y viceversa.
- [ ] **Ventas última semana**: barras por día (últimos 7 días) con total y # transacciones.
- [ ] Consumo por mes, Top productos (monto/cantidad), Consumo por categoría (torta + leyenda), Día de la semana, Top 5 por día (apilado), tabla de cantidades vendidas — todas cargan.
- [ ] **Utilidades brutas: costos vs ingresos** → gráfica top 10 + KPIs (ingresos, costos, utilidad, margen %) + tabla paginada. Filtro Todos / Productos / Servicios.
- [ ] Cada gráfica tiene una descripción corta debajo del título.

### 4.6 Dashboard — Inventario
- [ ] Stock por ubicación (gráfica + tarjetas con valor en costo).
- [ ] Productos por categoría (paginada).
- [ ] **Días estimados de stock** (tabla con 🔴/🟡/🟢 y acción sugerida).

### 4.7 Dashboard — Alertas
- [ ] Tabla con productos en stock bajo o sin stock, con chips por ubicación. Click en el nombre → ficha del producto.

### 4.8 Usuarios
- [ ] Ves los 5 usuarios; tu fila marcada con "(tú)".
- [ ] No puedes desactivarte ni cambiarte el rol a ti mismo.
- [ ] Crear `testuser` (Recepción) → modal con credenciales.
- [ ] Editar nombre / cambiar contraseña / Reset pw / Desactivar / Reactivar / cambiar rol → todos funcionan.
- [ ] Loguearte como `testuser` desactivado → "Tu cuenta está desactivada".
- [ ] Borra `testuser` al final si quieres dejar limpio.

**Notas:**
>

---

## 5. Carga masiva CSV

### 5.1 Plantilla
- [ ] Como `admin`/`maestro`: "⬇ Descargar plantilla CSV" → baja `plantilla-transacciones-<fecha>.csv`.
- [ ] El archivo trae **solo encabezados + una fila por producto** (sin líneas de instrucciones `#`).
- [ ] Cada fila muestra `nombre_producto` (referencia) y la columna `valor_unitario` pre-llenada.
- [ ] Como `recepcion1`: la plantilla trae filas de venta y traslado, **no** de compra.

### 5.2 Llenado e importación
- [ ] Pon cantidad a 3-4 productos, deja el resto en 0. Sube el archivo.
- [ ] El preview muestra: filas leídas, válidas, con error, **ignoradas** (las de cantidad 0).
- [ ] Importar → toast verde, las transacciones aparecen con badge **CSV**.

### 5.3 Validaciones e importación parcial
- [ ] Una fila con código de producto inexistente → aparece en rojo con mensaje claro.
- [ ] Una fila con ubicación que no existe → roja.
- [ ] Una venta que supera el stock → roja "Stock insuficiente: hay X, intentas mover Y".
- [ ] **Importante:** aunque haya filas rojas, el botón "Importar" se mantiene activo y al confirmar **se importan solo las válidas**; las inválidas se reportan en el resumen.
- [ ] Recepción subiendo una fila de compra → cae en rojo "Tu rol no permite registrar compras".

### 5.4 Agrupación por ticket
- [ ] 2 filas con el mismo `ticket` (mismo tipo y fecha) → se crea **1 transacción** con 2 ítems.

**Notas:**
>

---

## 6. Costo / precio y edición de transacciones (casos clave)

- [ ] Registrar una venta → en BD/ CSV "Resumen por ítem" el `costo_unitario` queda con el costo del producto al momento (snapshot), aunque no se pidió en la UI.
- [ ] Editar una **venta** cambiando solo el **precio** (sin tocar cantidad) → guarda sin problema.
- [ ] Editar una **compra antigua** cambiando solo el **costo** (sin tocar cantidad), incluso si ya se vendió parte de ese stock → **debe guardar sin error** (edición ligera, no toca stock).
- [ ] Editar una venta cambiando la **cantidad** de 2 → 5 → el stock baja 3 unidades adicionales.
- [ ] Editar fallida: cambiar una venta a un producto sin stock suficiente → error claro y la transacción original queda intacta.
- [ ] Eliminar una compra cuyo stock **todavía está disponible** → el stock baja correctamente.
- [ ] Intentar eliminar una compra cuyo stock **ya se vendió/movió** (dejaría negativo) → error **descriptivo** (no jerga técnica) explicando por qué.

**Notas:**
>

---

## 7. Descargar CSV de transacciones (admin/maestro)

- [ ] En `/transacciones`, botón "⬇ Descargar CSV" (recepción NO lo ve).
- [ ] Modo **Resumen por ítem**: máx 2 filas por producto (venta/compra), con columnas de costo, margen y margen %. Sin traslados.
- [ ] Modo **Historial por transacción**: una fila por transacción, incluyendo traslados.
- [ ] Fecha fin anterior a inicio → error. Rango > 2 años → error.
- [ ] El archivo abre bien en Excel con acentos y ñ correctos.

**Notas:**
>

---

## 8. UX general

- [ ] Logo nítido y nav sticky.
- [ ] Responsive: probar Transacciones y Nueva transacción en pantalla de celular.
- [ ] Toasts de éxito/error aparecen y desaparecen solos.
- [ ] Sin errores en la consola del navegador (F12 → Console).
- [ ] Los mensajes de error que aparezcan son entendibles (sin nombres técnicos de columnas).

**Notas:**
>

---

## Cómo reportar bugs

```
🐛 BUG en [pantalla / acción]
- Rol: [recepcion1 / admin / maestro]
- Pasos:
   1. ...
   2. ...
- Esperado: ...
- Resultado: ...
- Screenshot: (link o descripción)
```
