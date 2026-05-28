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
> - Antes de probar, asegúrate de haber ejecutado en Supabase, en orden: `schema.sql` (si aplica), `rls.sql`, `migration-costo-unitario.sql`, `migration-tarifas-descuento.sql`, **`migration-tx-actualizado.sql`** (nueva — registra quién/cuándo editó una transacción).

---

## A2. Ronda 3 — resolución de tus últimos comentarios

**Corregidos en esta ronda (✅):**
- [x] **Sin decimales en COP**: `formatCOP` ahora muestra los pesos sin las dos cifras decimales en TODA la webapp (toasts, tarjetas, tablas, gráficas, CSV).
- [x] **Overflow de tarjetas**: las tarjetas grandes (Valor vendido, Valor invertido, KPIs del dashboard, valor en ubicación) ahora truncan con `…` si un número es muy grande, en vez de salirse del borde.
-> Y cómo podría ver el número si ya es muy grande?
- [x] **CSV import a las 00:01**: las transacciones importadas por CSV (que no traen hora) quedan a las **00:01 AM** del día indicado, así aparecen primero al ordenar por fecha. Antes quedaban a las 12:00.
- [x] **Export CSV — rango máximo 1 año**: cambiado de 2 a 1 año (Manual del Maestro actualizado).
- [x] **Dashboard › Inventario** tarjetas por ubicación: ya no dicen "X en costo" sino **"X valor en inventario estimado"** (calculado como cantidad × costo promedio de compra). Si la ubicación tiene unidades pero el producto no tiene compras registradas todavía, muestra "aún sin costo de compra registrado".
- [x] **Ficha de ubicación**: el KPI "Valor estimado (costo)" ahora se llama **"Valor en inventario estimado"** y usa el costo promedio de compra del producto × cantidad por ubicación (ya no sale 0 cuando el catálogo no tiene costo).
- [x] **CSV plantilla — instrucciones**: la fila de la columna `ubicacion` lista ahora los **nombres exactos** de las ubicaciones activas (sacados de la BD).
- [x] **Costo unitario en ventas = costo promedio del momento**: al registrar una venta (manual o por CSV), el `costo_unitario` del item se guarda automáticamente como el **costo promedio ponderado de compras** del producto en ese momento (no como el costo del catálogo que muchas veces estaba en 0).
- [x] **CSV export — fallback de costo**: para ventas viejas que ya quedaron en BD con `costo_unitario = 0`, el reporte "Resumen por ítem" cae al costo promedio actual del producto, así el margen siempre sale realista.
- [ ] **Dashboard — nota por gráfica**: cuando hay filtros activos, las gráficas que no los pueden aplicar (Ventas última semana, Día de la semana, Top 5 por día, Utilidades) muestran un aviso amarillo discreto: "ⓘ Los filtros activos (…) no se aplican a este resumen".

**Respuestas / decisiones (💬):**
- *"¿Cuál es la necesidad de guardar el costo unitario en las ventas? Veo muchas con 0."* → Sí es útil: permite calcular **margen real por venta** en el reporte CSV "Resumen por ítem" y conservar el costo histórico aunque después cambie el catálogo. **Solución implementada arriba**: ahora se guarda el costo promedio ponderado del producto al momento de la venta (no el catálogo). Para las ventas viejas que quedaron en 0, el reporte de margen ya tiene fallback que usa el costo promedio actual.
- *"¿La plantilla de carga masiva podría ser xlsx con dropdowns en lugar de CSV?"* → **Sí es técnicamente posible** (el proyecto ya tiene la dependencia `xlsx`). Implicaría:
  - Generar un `.xlsx` real con una hoja de datos + una hoja oculta con la lista de ubicaciones, y aplicar **data validation** en la columna `ubicacion` y `ubicacion_destino` apuntando a esa lista. También se puede agregar dropdown para `tipo` (venta/compra/traslado).
  - El parseo al subir tendría que aceptar xlsx (no solo CSV) — ya hay `xlsx` en el proyecto para leerlo.
  - **Recomendación**: lo dejo como mejora post-entrega. El CSV actual ya funciona y la lista de ubicaciones está visible en las instrucciones de la pantalla. Si quieres priorizar el xlsx después de la entrega, son ~2-3 h de trabajo.

**Aún pendiente / a confirmar (⚠️):**
- Los filtros del tab Ventas **no recalculan** las gráficas server-aggregated (última semana, día de semana, top 5, utilidades). Estas ahora avisan claramente cuando hay filtros activos. Hacer que respondan a filtros = pasar a re-aggregación en cliente con la data cruda de transacciones (no es trivial, ~3-5 h). **Avísame si lo quieres antes de la entrega o queda para una segunda fase.**

---

## A. Ronda post-revisión — resolución de tus comentarios y qué re-probar

Estos son los puntos que dejaste con `->`. Marca el check al re-probar.

**Corregidos (✅):**
- [x] **Ficha de ubicación**: ya no muestra productos con cantidad 0.
- [x] **Toasts** (mensajes momentáneos): ahora con fondo sólido (sin transparencia).
- [x] **Ficha de producto**: nueva tarjeta **"Valor vendido"** junto a "Valor invertido".
-> Quiero quitar las dos cifras decimales de los valores. También necesito que tengas cuidado con que los contenidos de los badges no se salgan de ellos. Así los valores sean númeross muy grandes, no se pueden salir del margen del badge.
- [x] **Traslado**: ya NO pide costo unitario ni muestra subtotal; solo mueve cantidades (el footer dice "N unidades a mover").
- [x] **Tabla de transacciones**: los ítems de **venta** muestran "— desde \<ubicación\>" y los de **compra** "— a \<ubicación\>" (como el traslado muestra origen → destino).
- [x] **Venta**: el precio es un **dropdown de tarifas** del producto (Detal, Staff, etc., con su precio) + opción **"Otro"** para valor personalizado.
-> Recuerda quitar las dos cifras decimales en toda la webapp por favor.
- [x] **Última edición**: al editar una transacción, bajo la fecha aparece "editado \<fecha/hora\>" y bajo "Registró" aparece "editó: \<usuario\>". El creador original NO cambia.
- [x] **Botón "Nueva tarifa"**: ya no se desborda el texto.
- [x] **Histórico de ventas (mensual)** en la ficha del producto: ahora combina Alegra + ventas del sistema, mes a mes hasta el mes actual.
- [x] **Historial de ajustes**: ahora solo muestra ajustes manuales (conteo, merma, rotura, corrección, ingreso inicial). Ya NO aparecen las "reversa de transacción/traslado".
- [x] **Dashboard › Ventas**: nuevo filtro de **Producto** (multi).
-> Recuerda que los filtros deben afectar a todas las gráficas de la página. Si alguna no se afecta por algún filtro, que la gráfica tenga un pequeño mensaje que indique que el filtro seleccionado no es aplicable a esa gráfica. Pero por ejemplo, la de consumo por mes sí debe filtrarse normal.
- [x] **Dashboard › Utilidades**: el costo usa el **costo promedio de compra** × unidades vendidas.
- [x] **Dashboard › Inventario**: el "valor en costo" por ubicación usa el costo promedio (ya no sale "no configurado" si hay compras).
-> Cambiemos el nombre a "valor en inventario estimado". Este valor lo estas calculando con los costos promedio * la cantidad comprada de cada producto en cada ubicación correcto? Así debe de sacarse este valor.
-> Este valor debe poderse ver en "Valor estimado" en la vista de una ubicación, en este momento salen en 0, pero debe ser calculado como te indico y aparecer aquí también.
- [x] **Dashboard › Alertas**: filtros por categoría y por producto, botón **"Ver"** por fila, y la columna de ubicaciones solo muestra las que tienen stock > 0.
- [x] **Gráficas que no usan Alegra**: ahora lo indican en su descripción.

**Respuestas / notas (💬):**
- *"¿Qué significa la reversa de transacción/traslado con motivo corrección en el historial de ajustes?"* → Eran los ajustes automáticos que el sistema hacía al editar/eliminar transacciones. Tienes razón en que no pertenecen al historial de ajustes manuales: **los quité de esa vista**. El stock se sigue revirtiendo igual, pero ya no ensucia el historial.
- *"Recepción ve el botón Traslado además de Venta"* → Correcto y esperado: recepción puede registrar ventas y traslados, pero **no** compras.

**Pendiente / parcial (⚠️) — dime si lo quieres y lo hago:**
- **Filtros que apliquen a TODAS las gráficas de Ventas**: hoy los filtros (categoría/producto/mes/fecha) aplican a las gráficas basadas en el histórico mensual (consumo por mes, top productos, por categoría, cantidades vendidas). Las gráficas de **Ventas última semana, Día de la semana, Top 5 por día y Utilidades** son resúmenes globales de las transacciones y **no** se filtran (lo aclara una nota en pantalla). Hacer que respondan a los filtros requiere recalcularlas en vivo desde las transacciones — es un cambio más grande; avísame si lo priorizamos.
- **Filtros en el tab Inventario** (stock por ubicación / días estimados): no se agregaron (esas vistas son resúmenes globales). El tab **Alertas** sí tiene filtros.

---

## 0. Preparación de datos para la prueba

Para probar bien necesitas algo de stock. Hazlo en este orden:

- [x] Como `maestro`, registra **1 compra** de 3-4 productos (entra stock a Bodega Principal).
- [x] Registra **1 traslado** de algunas unidades de Bodega → Barra/Nevera.
- [x] Verifica que el stock se movió correctamente en la ficha de esos productos.

-> Al entrar a ver una ubicación, no deben aparecerme productos con cantidad 0 en stock.
-> Los mensajes que aparecen momentáneos de confirmación o de error deben tener fondo sólido, no con trasnparencia.
-> Cuando entro a visualizar un producto, quiero que también aparezca un batch de valor total vendido, así como el que aparece de valor invertido.
-> Las transacciones de tipo traslado NO deben solicitar costo unitarioni mostrar subtotal, solo son movimientos de cantidades entre ubicaciones.
---

## 1. Login y seguridad de rutas

### 1.1 Acceso bloqueado sin sesión
- [x] Abre el sitio en incógnito → te lleva a `/login`.
- [x] Intenta abrir `/dashboard` directo → redirige a `/login?next=/dashboard`.
- [x] Intenta `/inventario`, `/usuarios`, `/tarifas` sin sesión → todas redirigen a login.

### 1.2 Login válido / inválido
- [x] Login `CesarC` / `CesarPP2026` → home con saludo y badge "MAESTRO".
- [x] Password incorrecta → "Usuario o contraseña incorrectos".
- [x] Usuario inexistente → mismo mensaje (no revela si existe).
- [x] `CESARC` o ` cesarc ` (mayúsculas/espacios) → entra igual (case-insensitive).
- [x] Logout desde el avatar → vuelve a `/login`.

**Notas:**
>

---

## 2. Rol Recepción (`recepcion1`)

### 2.1 Lo que NO debe ver
- [x] Nav: solo "Transacciones".
- [x] Forzar en URL `/dashboard`, `/inventario`, `/ubicaciones`, `/categorias`, `/tarifas`, `/usuarios` → todas redirigen.

### 2.2 Registrar venta
- [x] "+ Nueva transacción" → solo aparece el botón **Venta** (no Compra ni Traslado).
-> Sí aparece traslado pero está bien, los de recepción deben poder hacer ambas cosas mas no registrar compras.
- [x] Buscar producto → agregarlo → el **Precio venta** se autocompleta con el Detal.
-> A la hora de registrar una venta, el precio de venta debe ser un dropdown con las opciones de las diferentes tarifas aplicadas a ese producto, con la opción adicional de "Otro" para ingresar un valor personalizado.
- [x] El campo de cantidad permite borrar y reescribir; los montos muestran separadores de miles.
- [x] Agregar el mismo producto dos veces con ubicaciones distintas → 2 líneas separadas.
- [x] Registrar → toast verde "Venta registrada". Aparece en la lista con fecha/hora, "Registró: recepcion1", badge verde.
-> En la visualización de la transacción en la tabla, Los items de una venta deben indicar de qué ubicación se sacó cada conjunto de items, podría ser la ubicación en letra pequeña al lado del producto. Algo como lo que aparece en los traslados al lado del producto que se vendió. Esto también debe ocurrir para las transacciones de tipo compra, indicando en la(s) ubicación(es) donde se ingresó el producto.
- [x] **No** se pide costo en la venta (solo precio).

### 2.3 Editar/eliminar (restricciones de recepción)
- [x] Editar su propia venta **de hoy** → permite. Cambiar cantidad y guardar → "Transacción actualizada".
- [x] Eliminar su propia venta de hoy → confirma → desaparece y el stock se revierte.
- [x] Login `recepcion2`: NO ve botones Editar/Eliminar en las ventas de `recepcion1`.

### 2.4 Filtros de la lista
- [x] Filtros por categoría (multi) y producto (multi) funcionan.
- [x] Filtro por rango de fechas funciona.
- [x] Paginación: cambiar de página con flechas y escribiendo el número de página directamente.

**Notas:**
>

---

## 3. Rol Admin (`admin`)

### 3.1 Accesos
- [x] Nav: Transacciones, Inventario, Ubicaciones (NO Dashboard, Categorías, Tarifas, Usuarios).
- [x] Forzar `/dashboard`, `/usuarios`, `/tarifas`, `/categorias` → redirigen.

### 3.2 Transacciones (los 3 tipos)
- [x] "+ Nueva transacción" → aparecen Venta / Compra / Traslado.
- [x] **Compra**: producto + ubicación destino + cantidad + costo → guarda. La columna del valor dice "Costo unitario".
- [x] **Traslado**: origen ≠ destino + cantidad → guarda. La fila muestra "origen → destino". El costo se prellena y es editable.
- [x] Traslado con origen = destino → aviso rojo, no deja guardar.
- [x] Venta de producto sin stock suficiente → aviso rojo, no deja guardar.
- [x] Venta de un producto inventariable + un servicio en la misma transacción → ambos se registran; el servicio no descuenta stock.

### 3.3 Permisos de edición de Admin
- [x] Editar/eliminar una transacción creada por `recepcion1` o por otro admin → permite (cualquier día).
- [x] Intentar editar/eliminar una transacción creada por un **Maestro** → NO permite, mensaje claro.

### 3.4 Inventario
- [x] `/inventario` muestra la lista con filtros (categoría, ubicación, producto, rango de cantidad) y paginación con input de página.
- [x] "+ Nuevo ítem" → NO muestra "Costo unitario" ni "Precios por tarifa". Aparece aviso de que solo el Maestro los gestiona.
- [x] Crear un producto sin precio → se crea OK.
- [x] Ficha de producto: NO aparece botón "Eliminar" (solo Maestro).
- [x] Hacer un ajuste de inventario → funciona.

### 3.5 Ubicaciones
- [x] Crear una ubicación nueva → aparece en la lista.
- [x] Click en el nombre de una ubicación (o botón "Ver") → abre la **ficha de la ubicación** con KPIs y tabla de productos presentes (cantidad > 0).
- [x] Editar una ubicación.
- [x] Borrar una ubicación sin movimientos → se borra. Con movimientos → se marca inactiva.

**Notas:**
>

---

## 4. Rol Maestro (`maestro` o `CesarC`)

### 4.1 Accesos
- [x] Nav: los 6 links (Transacciones, Inventario, Ubicaciones, Dashboard, Categorías, Tarifas, Usuarios).
- [x] Puede editar/eliminar transacciones de cualquier usuario y cualquier día.
-> Si ocurre una edición de una transacción, quiero que en fecha y ahora aparezca la fecha y hora de la última edición, y también debe aparecer en la columna de REGISTRÓ el que realizó la última actualización (bajo el que registró la transacción)

### 4.2 Tarifas
- [x] En `/tarifas` ves la lista con columna "Descuento %".
- [x] Crear tarifa "Staff Prime Padel", código `STAFF_PRIME`, descuento `20`% → se crea.
-> EL botóm de nueva tarifa debe de ajustarse bien a la pantalla, el texto se sale del botón.
- [X] Editar Detal → el campo de descuento aparece bloqueado/avisado (Detal es base, 0%).
- [X] Eliminar la tarifa Detal → NO se permite (mensaje claro).
- [X] Eliminar una tarifa con precios asignados → se desactiva en vez de borrarse.

### 4.3 Precios por tarifa en un producto
- [x] Edita un producto con precio Detal definido. En "Precios por tarifa" la fila de Staff Prime muestra `auto: <Detal − 20%>`.
- [x] Escribe un precio manual en Staff Prime → se guarda. Al volver a abrir, ese precio aparece como "Manual".
- [x] Borra el precio manual (déjalo en 0) → vuelve a calcular automático.
- [x] Cambia el descuento de la tarifa al 25% → los productos sin precio manual reflejan el nuevo cálculo; los manuales no cambian.

### 4.4 Ficha de producto — costos e histórico
- [x] Las 4 tarjetas de arriba muestran: Stock total, **Costo promedio** (de compras), **Última compra**, **Valor invertido**.
- [x] Si el producto tiene compras, el costo promedio = promedio ponderado de esas compras (verifícalo con la tabla de histórico de transacciones abajo).
- [x] "Stock por ubicación" muestra **solo** ubicaciones con cantidad > 0.
- [x] "Histórico de transacciones" lista ventas/compras/traslados del producto, con paginación (flechas + número de página).
- [x] "Histórico de ventas (mensual)" muestra los datos de Alegra, paginado.
-> El histórico de ventas no solo debe mostrar lso datos de alegra, debe mostrar los datos hasta el mes actual, incluyendo lo que se ha registrado en el sistema ERP.
- [x] "Historial de ajustes" muestra los ajustes, paginado.
-> En el historial de ajustes peinso que SOLO deben aparecer los ajustes que se hayan realizado desde ajuste de inventario, mas no temas relacionados con las transacciones, ya que este historial es diferente. O qué significa lo de reversa de transacción o de traslado que aparecen con motivo "correccion". Consideras que eso debería de aparecer ahí?

### 4.5 Dashboard — Ventas
- [x] KPIs arriba (productos, ubicaciones, stock total, valor inventario, alertas).
- [x] Filtros: Categoría (multi), **Mes** (atajo) y **Fecha desde/hasta**. Al elegir Mes se limpian las fechas y viceversa.
-> Me gustaría un filtro por prodcuto, con selección múltiple.
- [x] **Ventas última semana**: barras por día (últimos 7 días) con total y # transacciones.
- [x] Consumo por mes, Top productos (monto/cantidad), Consumo por categoría (torta + leyenda), Día de la semana, Top 5 por día (apilado), tabla de cantidades vendidas — todas cargan.
- [x] **Utilidades brutas: costos vs ingresos** → gráfica top 10 + KPIs (ingresos, costos, utilidad, margen %) + tabla paginada. Filtro Todos / Productos / Servicios.
- [x] Cada gráfica tiene una descripción corta debajo del título.
-> Los filtros de cada página deben aplicarse a todas las gráficas de la página.
-> Para las utilidades debes utilizar el costo promedio de cada prodcuto y/o servicio para multiplciar por las unidades vendidas y calcular así la utilidad.
-> Para las gráficas que NO consideren la data vieja de alegra, coloca un pequeño mensaje que lo informe.

### 4.6 Dashboard — Inventario
- [x] Stock por ubicación (gráfica + tarjetas con valor en costo).
-> El valor en costo aparece como no configurado, debería ser la suma de los costos promedios * cantidades de cada proucto dentro de la ubicación.
- [x] Productos por categoría (paginada).
- [x] **Días estimados de stock** (tabla con 🔴/🟡/🟢 y acción sugerida).

### 4.7 Dashboard — Alertas
- [x] Tabla con productos en stock bajo o sin stock, con chips por ubicación. Click en el nombre → ficha del producto.

-> Agrega filtros por producto y por categoría en las páginas de inventario y alertas en el dashboard
-> En la tabla de alertas, cada fila de producto debe tener un botón de "ver" para ver el producto en el inventario
-> En la columna de ubicaciones en la tabla de alertas, debe salirme únicamente las ubicaciones donde sí hay producto (cantidad mayor a 0)

### 4.8 Usuarios
- [x] Ves los 5 usuarios; tu fila marcada con "(tú)".
- [x] No puedes desactivarte ni cambiarte el rol a ti mismo.
- [x] Crear `testuser` (Recepción) → modal con credenciales.
- [x] Editar nombre / cambiar contraseña / Reset pw / Desactivar / Reactivar / cambiar rol → todos funcionan.
- [x] Loguearte como `testuser` desactivado → "Tu cuenta está desactivada".
- [x] Borra `testuser` al final si quieres dejar limpio.

**Notas:**
>

---

## 5. Carga masiva CSV

### 5.1 Plantilla
- [x] Como `admin`/`maestro`: "⬇ Descargar plantilla CSV" → baja `plantilla-transacciones-<fecha>.csv`.
- [x] El archivo trae **solo encabezados + una fila por producto** (sin líneas de instrucciones `#`).
- [x] Cada fila muestra `nombre_producto` (referencia) y la columna `valor_unitario` pre-llenada.
- [x] Como `recepcion1`: la plantilla trae filas de venta y traslado, **no** de compra.
-> Me gustaría que en la tabla de instrucciones, el texto de exlicación de ubicacion, tuviese la lista de ubicaciones (exacta) que actualmente hay (sacándola de la dB claro).
-> Crees que la plantilla pudiese ser un xlsx con dropdowns con las listas de ubicaciones, y que todo fuese una tabla bien estructurada para filtrar y demás? O se complica mucho?

### 5.2 Llenado e importación
- [x] Pon cantidad a 3-4 productos, deja el resto en 0. Sube el archivo.
- [x] El preview muestra: filas leídas, válidas, con error, **ignoradas** (las de cantidad 0).
- [x] Importar → toast verde, las transacciones aparecen con badge **CSV**.
-> Todo se guarda bien, lo único que me gustaría es que la hora de estas transacciones quedase como las 00:01 am para que aparezcan primero que las demaás transacciones que se guarden para ese día.

### 5.3 Validaciones e importación parcial
- [x] Una fila con código de producto inexistente → aparece en rojo con mensaje claro.
- [x] Una fila con ubicación que no existe → roja.
- [x] Una venta que supera el stock → roja "Stock insuficiente: hay X, intentas mover Y".
- [x] **Importante:** aunque haya filas rojas, el botón "Importar" se mantiene activo y al confirmar **se importan solo las válidas**; las inválidas se reportan en el resumen.
- [x] Recepción subiendo una fila de compra → cae en rojo "Tu rol no permite registrar compras".

### 5.4 Agrupación por ticket
- [x] 2 filas con el mismo `ticket` (mismo tipo y fecha) → se crea **1 transacción** con 2 ítems.

**Notas:**
>

---

## 6. Costo / precio y edición de transacciones (casos clave)

- [ ] Registrar una venta → en BD/ CSV "Resumen por ítem" el `costo_unitario` queda con el costo del producto al momento (snapshot), aunque no se pidió en la UI.
-> Cuál sería el costo actual del producto? EL costo promedio? Cuál es la necesidad de que las transacciones de tipo venta guarden en costo unitario del producto? Esto lo ves necesario o podríamos quitar esto?
-> Veo muchas transacciones con costo_unitario en 0, si lo vamos a guardar entonces hay que tomar el costo unitario promedio del producto en el momento de la transacción.
- [x] Editar una **venta** cambiando solo el **precio** (sin tocar cantidad) → guarda sin problema.
- [x] Editar una **compra antigua** cambiando solo el **costo** (sin tocar cantidad), incluso si ya se vendió parte de ese stock → **debe guardar sin error** (edición ligera, no toca stock).
- [x] Editar una venta cambiando la **cantidad** de 2 → 5 → el stock baja 3 unidades adicionales.
- [x] Editar fallida: cambiar una venta a un producto sin stock suficiente → error claro y la transacción original queda intacta.
- [x] Eliminar una compra cuyo stock **todavía está disponible** → el stock baja correctamente.
- [x] Intentar eliminar una compra cuyo stock **ya se vendió/movió** (dejaría negativo) → error **descriptivo** (no jerga técnica) explicando por qué.

**Notas:**
>

---

## 7. Descargar CSV de transacciones (admin/maestro)

- [x] En `/transacciones`, botón "⬇ Descargar CSV" (recepción NO lo ve).
- [x] Modo **Resumen por ítem**: máx 2 filas por producto (venta/compra), con columnas de costo, margen y margen %. Sin traslados.
-> En el resumen por item, para las transacciones tipo venta, el costo_total me imagino que toma el costo_unitario y lo cmultiplica por la cantidad vendida, la cosa es que muchos se han estado guardando en 0 como te comentaba más arriba, por lo que necesito que guardemos bien el costo_unitario en las ventas, utilizando el costo promedio de producto al momento de venderlo.
- [x] Modo **Historial por transacción**: una fila por transacción, incluyendo traslados.
- [x] Fecha fin anterior a inicio → error. Rango > 2 años → error.
- Reduzcamos el rango a máximo 1 año y 1 día.
- [x] El archivo abre bien en Excel con acentos y ñ correctos.

**Notas:**
>

---

## 8. UX general

- [x] Logo nítido y nav sticky.
- [x] Responsive: probar Transacciones y Nueva transacción en pantalla de celular.
- [x] Toasts de éxito/error aparecen y desaparecen solos.
- [x] Sin errores en la consola del navegador (F12 → Console).
- [x] Los mensajes de error que aparezcan son entendibles (sin nombres técnicos de columnas).

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
