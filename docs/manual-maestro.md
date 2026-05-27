# Manual del Maestro — ERP Prime Padel

**Extensión del manual de usuario** para el rol **Maestro**, que tiene acceso total al sistema y es responsable de la configuración inicial, gestión del personal, mantenimiento del catálogo y administración general.

> Este documento asume que ya leíste el [Manual de usuario](./manual-usuario.md) general. Aquí solo cubrimos lo que es **exclusivo del rol Maestro** o requiere más contexto.

---

## Índice

1. [Responsabilidades del Maestro](#1-responsabilidades-del-maestro)
2. [Cuentas iniciales del sistema](#2-cuentas-iniciales-del-sistema)
3. [Gestión de usuarios](#3-gestión-de-usuarios)
4. [Configuración del catálogo](#4-configuración-del-catálogo)
5. [Gestión de listas de precios](#5-gestión-de-listas-de-precios)
6. [Carga del inventario inicial físico](#6-carga-del-inventario-inicial-físico)
7. [Interpretación del Dashboard](#7-interpretación-del-dashboard)
8. [Manejo de errores y correcciones](#8-manejo-de-errores-y-correcciones)
9. [Mantenimiento y rutinas mensuales](#9-mantenimiento-y-rutinas-mensuales)
10. [Soporte técnico y respaldos](#10-soporte-técnico-y-respaldos)

---

## 1. Responsabilidades del Maestro

El Maestro es el **administrador supremo** del sistema. Sus responsabilidades:

- **Configuración inicial**: cargar el inventario físico, definir precios y costos, gestionar categorías y ubicaciones.
- **Gestión del personal**: crear cuentas, asignar roles, restablecer contraseñas, desactivar empleados que dejan el club.
- **Análisis financiero**: revisar el Dashboard, identificar tendencias, anticipar compras necesarias.
- **Auditoría y correcciones**: revisar transacciones de otros usuarios, corregir errores en cualquier fecha, gestionar mermas y conteos.
- **Mantenimiento del catálogo**: agregar productos nuevos, ajustar precios cuando cambien, desactivar productos descontinuados.

**Hay 2 cuentas Maestro creadas:**
- `CesarC` (cuenta del proveedor del software, para soporte técnico)
- `maestro` (cuenta principal del club, para los dueños/gerencia)

Ambas tienen los mismos permisos. Recomendado: usar `maestro` para operación diaria del club, y dejar `CesarC` para cuando necesites soporte del proveedor.

---

## 2. Cuentas iniciales del sistema

Al entregarse el sistema, ya están creadas las siguientes cuentas:

| Usuario | Contraseña inicial | Rol | Para quién |
|---------|--------------------|-----|------------|
| `CesarC` | `CesarPP2026` | Maestro | Proveedor del software (soporte) |
| `maestro` | `MaestroPP2026` | Maestro | Dueños / gerencia del club |
| `admin` | `AdminPP2026` | Admin | Administrador general del club |
| `recepcion1` | `RecepcionPP1` | Recepción | Personal de caja, turno mañana |
| `recepcion2` | `RecepcionPP2` | Recepción | Personal de caja, turno tarde |

> **CRÍTICO:** En el primer ingreso, **cambia las contraseñas iniciales** desde la pantalla **Usuarios → Editar → Nueva contraseña**. Las cuentas que entregamos tienen contraseñas predecibles solo para facilitar el primer acceso.

---

## 3. Gestión de usuarios

### Convenciones de nombres

- **Usuarios**: solo minúsculas, sin espacios, sin acentos. Ejemplos válidos: `juan`, `recepcion3`, `bryan_p`, `maria.lopez`.
- **Nombre completo**: lo que aparecerá en la lista de transacciones. Pon descripciones claras: "Juan Pérez (caja noche)" o "Recepción turno tarde".
- **Roles**: usa el más restrictivo posible. La mayoría del personal debería ser Recepción. Solo deberían ser Admin las personas que gestionan el inventario y compras al proveedor.

### Cuándo usar cada acción

- **Crear**: cuando llega personal nuevo. Pídele al usuario una contraseña que recuerde, o usa la generada automáticamente y compártela.
- **Editar**: cambiar nombre o usuario (rara vez), o ayudar al usuario a cambiar su contraseña.
- **Reset pw**: cuando el usuario olvidó su contraseña. Genera una aleatoria, se la compartes por WhatsApp.
- **Cambiar rol**: si alguien fue ascendido (recepción → admin) o cambió de turno.
- **Desactivar**: cuando un empleado deja el club. **No lo elimines** — su historial de transacciones se conserva. Si vuelve, simplemente lo reactivas.

### ¿Qué pasa si elimino un usuario?

**No hay opción de eliminar — solo desactivar**. Esto es a propósito: si eliminamos al usuario también se eliminarían todas sus transacciones de la auditoría, y eso rompería el histórico contable. Desactivar conserva los datos pero impide el ingreso.

---

## 4. Configuración del catálogo

### Categorías

> 16 categorías precargadas desde el catálogo de Alegra.

**Cuándo crear una categoría nueva**: si tienes una nueva línea de productos que no encaja en las existentes (ej. "Suplementos deportivos").

**Cuándo desactivar**: si dejas de manejar un tipo de producto. Los productos asociados se quedan con la categoría inactiva — no afecta su funcionamiento, solo no aparece como opción para nuevos productos.

> **Tip:** evita crear demasiadas categorías. Una categoría útil debería tener al menos 3-5 productos. Si tienes muchas categorías de 1 producto, considera consolidarlas.

### Ubicaciones

> 7 ubicaciones precargadas: Bodega Principal, Nevera Barra, Nevera Cajero, Barra Cajero, Vitrina, Oficina, Otro.

**Cuándo crear una ubicación nueva**: si abres un nuevo punto físico de almacenamiento (ej. "Nevera Vóley" si abren el área de vóley playa).

**Orden recomendado** (campo "Orden en listas"):
- 1: Barra Cajero (la más usada para ventas)
- 2: Nevera Barra
- 3: Vitrina
- 4: Nevera Cajero
- 10: Bodega Principal
- 20: Oficina
- 30: Otro

Esto define el orden en que aparecen los selectores de ubicación cuando recepción hace una venta.

### Productos

**Datos críticos a configurar para cada producto al inicio:**

1. **Costo unitario**: lo que pagas al proveedor por unidad. Necesario para que el Dashboard calcule el "valor del inventario en costo" y los reportes financieros funcionen.
2. **Precio Detal**: lo que cobras al público. El sistema lo autocompleta en cada venta.
3. **Stock mínimo (alerta)**: el sistema generará alerta cuando el stock total caiga a este valor. Calibralo según la velocidad de venta:
    - Productos de alta rotación (cervezas, agua): 12-24 unidades de mínimo.
    - Productos de baja rotación (bolas de pádel especiales): 2-3 unidades.
4. **Impuesto**: por defecto "Sin impuesto". Solo cambia si el producto requiere mostrar IVA específico para algún reporte interno.

> Los Admin pueden crear/editar productos pero **no pueden tocar el costo ni los precios**. Esos quedan reservados para ti como Maestro porque son sensibles para finanzas.

---

## 5. Gestión de tarifas

### Concepto

Una **tarifa** (antes llamada "lista de precios") es un canal de venta con su propio precio. Permite cobrar el mismo producto distinto según a quién se le venda.

Cada tarifa tiene un **descuento predeterminado en %** que se aplica al precio Detal. Esto significa:

```
precio efectivo de un producto en la tarifa X = precio Detal × (1 − descuento%)
```

Si un producto tiene un precio fijo configurado para esa tarifa, ese precio **anula** el cálculo automático.

### Tarifas precargadas

| Código | Nombre | Descuento sugerido | Para qué |
|--------|--------|--------------------|----------|
| `DETAL` | Detal (default) | 0% (base) | Precio público al cliente final |
| `EQUIPO_PRIME` | Equipo Prime | ~15-20% | Miembros del equipo del club |
| `KEVIN_GARCIA` | Kevin García | (configurable) | Profesor externo |
| `BRYAN_PERAFAN` | Bryan Perafán | (configurable) | Profesor externo |
| `ALTERNO_1` ... `ALTERNO_8` | Alternos 1-8 | — | Reservados para nuevos canales |

### Caso de uso completo — Crear una tarifa para el staff de Prime Padel

Imaginemos que quieres darle a tu staff (cajeros, profesores internos, etc.) un 20% de descuento sobre todos los productos.

**Paso 1 — Crear la tarifa**

1. Entra al menú **Tarifas** (arriba en el nav).
2. Click en **"+ Nueva tarifa"**.
3. Llena el formulario:
    - **Nombre:** `Staff Prime Padel`
    - **Código (interno):** `STAFF_PRIME` (mayúsculas y guion bajo)
    - **Descuento predeterminado:** `20` (significa 20%)
    - **Orden:** déjalo como viene (sirve para ordenar la lista)
    - **Estado:** Activa
4. Click **Crear**.

A partir de ese momento, **todos los productos del catálogo automáticamente tienen un precio Staff Prime Padel = Detal × 0.8** (sin necesidad de configurar cada producto uno por uno).

**Paso 2 — (Opcional) Ajustar el precio puntual de algún producto**

Si para un producto específico el descuento debe ser distinto (ej. una cerveza importada no entra en la promoción), vas a la ficha del producto:

1. **Inventario** → busca el producto → click en su nombre.
2. Click **Editar**.
3. Baja hasta la sección **Precios por tarifa**.
4. En la fila de "Staff Prime Padel" verás:
    - El placeholder del campo dice `auto: $8.000` (por ejemplo) — eso es el cálculo automático.
    - Si escribes un valor manualmente (ej. $9.000), ese precio anula el automático.
    - Para volver al cálculo automático, vacía el campo (déjalo en 0 o en blanco).

**Paso 3 — (Opcional) Cambiar el descuento global más adelante**

Si en el futuro decides que el descuento Staff sube al 25%, ve a **Tarifas → Editar → cambia "Descuento predeterminado" a 25 → Guardar**. Automáticamente todos los productos que usan el cálculo automático ajustan su precio. Los productos con precio manual NO se ven afectados (siguen con su precio fijo).

### Cómo ver los precios efectivos de un producto

Entra a la ficha del producto (**Inventario → click en el nombre**). En la sección **"Precios por tarifa"** aparece una tabla con:
- **Tarifa**: nombre + descuento si tiene.
- **Precio**: el precio efectivo (manual o calculado).
- **Origen**: `Precio base` (Detal), `Manual` (override puntual) o `Auto (Detal − X%)` (cálculo automático).

### Otros casos comunes

**Llega un profesor nuevo (ej. "Pedro López")**
- Vas a `/tarifas` → editas una tarifa Alterno: nombre → `Pedro López`, código → `PEDRO_LOPEZ`, descuento → el que aplique.
- Si Pedro tiene un precio especial para clases puntuales, vas a la ficha de esos productos y configura el precio manual.

**Un profesor ya no trabaja en el club**
- Vas a `/tarifas` → "Editar" en su tarifa → cambias estado a **Inactiva**.
- O click "Eliminar": si tiene precios asignados se desactiva en lugar de borrarse (preserva el histórico de ventas).

### ¿Cuándo NO usar tarifas distintas?

Si todos tus productos se venden a un solo precio público, ignora esta función. Solo usa Detal con descuento 0% y olvídate de las demás. Es opcional para casos especiales.

---

## 6. Carga del inventario inicial físico

Esta es la **acción más importante para que el sistema empiece a operar correctamente**. Antes de hacerla, todos los productos están en stock 0.

### Pasos

1. **Hace conteo físico** del club. Recomendado: dos personas, una cuenta y la otra anota.
2. **Llena una hoja** con: producto, ubicación, cantidad real.
3. **Inicia sesión como Maestro o Admin**.
4. Producto por producto:
    - Entra a la ficha del producto en `/inventario`.
    - Click **"Ajuste de inventario"**.
    - Selecciona la **ubicación** donde está el producto.
    - Escribe la **cantidad real**.
    - Motivo: **"Ingreso inicial (carga del inventario)"**.
    - Notas: "Conteo del [fecha], realizado por [nombres]".
    - Guarda.
5. Si el producto está en varias ubicaciones, repite el paso 4 por cada una.

### Atajo: muchos productos a la vez

Si tienes 100+ productos, hacer un ajuste por cada uno es lento. **Alternativa**:
- Pídele al proveedor del software que haga la carga vía CSV directo en BD (más rápido).
- O usa la carga masiva CSV de transacciones para registrar una "compra" inicial por cada ubicación. Esto carga el stock y queda como histórico.

### Después de la carga

- Verifica en `/dashboard → pestaña Inventario` que el stock por ubicación se ve correctamente.
- Verifica que la pestaña Alertas muestre solo los productos que realmente están bajos.
- A partir de aquí, el día a día es: registrar ventas/compras/traslados → el stock se mantiene actualizado automáticamente.

---

## 7. Interpretación del Dashboard

### KPIs (siempre arriba)

- **Productos activos**: cuántos productos hay en el catálogo. Útil para saber el tamaño del catálogo.
- **Stock total**: suma de unidades físicas. Si es muy alto y no se vende, hay sobre-inventario.
- **Valor inventario (costo)**: cuánto plata tienes "guardada" en stock. Si los productos no rotan, este valor es plata muerta.
- **Alertas de stock**: productos en o bajo el mínimo. Atender lo antes posible para no quedarte sin venta.
- **Variación vs mes anterior**: si es +%, las ventas están subiendo; si es -%, bajaron.

### Pestaña "Ventas y consumo"

**Filtra siempre por el rango de meses que te interese.** Por defecto muestra todo el histórico.

- **Ventas última semana**: monto y número de transacciones por día (últimos 7 días). Cifras reales del sistema, no histórico de Alegra.
- **Consumo por mes**: visión general de tendencia.
- **Top productos**: cuáles son los productos estrella. Útil para saber qué stockear más y qué productos podrías negociar mejor con el proveedor.
- **Por categoría**: qué tipo de productos genera más ingresos.
- **Días de la semana**: identifica los días de mayor venta. Sirve para programar personal y compras.
- **Utilidades brutas (costos vs ingresos)**: gráfica top 10 con barras verde (ingresos) y rojo (costos) por producto/servicio. KPIs arriba con totales y margen %. Filtro Todos / Solo productos / Solo servicios. Útil para responder "¿cuáles son mis productos más rentables?" — el margen % te dice cuánto ganas por cada peso de venta. Solo cuenta ventas reales del sistema (no el histórico de Alegra, porque ahí no hay costo por venta).

### Pestaña "Inventario"

- **Stock por ubicación**: detecta si hay desbalance (ej. mucho stock en Bodega y poco en Vitrina → mover).
- **SKUs por categoría**: salud del catálogo.
- **Días estimados de stock**: 🔴 productos a punto de agotarse. Calculado dividiendo el stock actual entre la velocidad promedio de venta de **todo el histórico** (independiente de los filtros del tab Ventas, para tener un promedio estable). **Revisa esta sección semanalmente** para evitar quiebres de stock.

> Cada gráfica del dashboard ahora trae una descripción corta debajo del título para que sepas qué te está mostrando.

### Pestaña "Alertas"

**Tu lista de TO-DO de compras.** Productos a comprar, ordenados por urgencia. Click en cada uno te lleva a la ficha donde puedes registrar la compra cuando llegue.

---

## 8. Manejo de errores y correcciones

### Una transacción se registró mal

- Si fue **hoy y por ti o un admin**: ese mismo usuario puede editarla o eliminarla.
- Si fue **otro día o por otro Maestro**: solo el Maestro puede modificarla. Ten cuidado: editar transacciones viejas afecta la historia.

### Inventario no cuadra con la realidad

Hacer un **conteo físico** y luego un **ajuste de inventario** con motivo "Conteo físico". Esto NO altera transacciones pasadas, solo deja registro de la diferencia.

### Producto se venció o rompió

Ajuste de inventario con motivo **"Merma"** o **"Rotura"** y notas explicativas. Queda en el historial del producto para auditoría.

### Cambié el precio y los reportes viejos cambiaron

Es normal: los **totales estimados** del histórico de Alegra (los marcados con asterisco *) se calculan con el precio actual. Las transacciones reales registradas en el sistema mantienen su precio original.

### Costo guardado en cada venta (margen automático)

Al registrar una **venta** solo se te pide el **Precio venta** (lo que paga el cliente). El sistema **guarda automáticamente** el costo del producto en ese momento (tomándolo del catálogo) sin que tengas que pensarlo. Esto sirve para:

- Calcular **margen real** en el reporte CSV "Resumen por ítem".
- Preservar el **costo histórico** de cada venta aunque después cambies el costo del producto en el catálogo.

En **compra** y **traslado** solo se pide un campo (Costo unitario), igual que antes.

> Si necesitas corregir el costo guardado en una venta pasada (por ejemplo, porque sabes que en esa venta puntual el costo fue distinto), pídeselo al proveedor del software — se puede ajustar directamente en la BD.

### Un usuario está bloqueado / no puede entrar

Pasos:
1. Verifica que su cuenta esté activa en `/usuarios`.
2. Si no recuerda contraseña, "Reset pw" para generar una nueva.
3. Si el problema persiste, verifica que esté escribiendo el usuario correcto (sin acentos).

### Limitaciones del sistema (reglas de protección)

Estas reglas son **intencionales**: protegen que el inventario nunca quede en un estado imposible. Cuando aparezca uno de estos avisos, no es un bug.

**En transacciones:**
1. **No se puede vender ni trasladar más stock del que hay** en la ubicación de origen. El sistema valida el stock disponible antes de guardar.
2. **En un traslado, origen y destino deben ser distintos.**
3. **Los servicios y productos no inventariables no manejan stock**: solo admiten ventas, no compras ni traslados.
4. **No se puede eliminar, ni cambiar la cantidad/ubicación de, una transacción si eso dejaría el stock de alguna ubicación en negativo.** El caso más común: una **compra antigua** cuyas unidades ya se vendieron o trasladaron. El sistema no puede "deshacer" un ingreso de stock que ya fue consumido.
   - **Sí se permite** editar el precio, costo, fecha o notas de esa transacción (eso no toca el stock — se hace con una edición "ligera" que actualiza solo esos campos).
   - Para corregir la cantidad de una compra antigua, primero registra una compra que reponga el faltante, o usa un ajuste de inventario.
5. **Un ajuste de inventario no puede dejar la cantidad en negativo** (mínimo 0).

**En el catálogo (borrado seguro):**
6. **Eliminar un producto con histórico** de ventas o transacciones lo **desactiva** (no lo borra), para no perder la historia. Lo mismo aplica a **categorías, ubicaciones y tarifas** con datos asociados: se desactivan en vez de borrarse.
7. **No se puede eliminar la tarifa Detal** (es la base de cálculo de las demás).
8. **Solo el Maestro puede editar costos y precios.** El Admin gestiona inventario y operación pero no toca finanzas.

**En permisos por rol:**
9. **Recepción** solo edita/elimina **sus propias** ventas y traslados **del día actual**, y no registra compras.
10. **Admin** edita/elimina cualquier transacción **excepto** las creadas por un Maestro.

**En carga masiva CSV:**
11. Las filas con un **código de producto inexistente** (o datos inválidos) se marcan en rojo y **se omiten**; las filas válidas sí se importan (importación parcial).
12. **Recepción** no puede importar filas de compra por CSV.

---

## 9. Mantenimiento y rutinas mensuales

### Exportar transacciones a CSV

Para auditoría externa, contabilidad o análisis en Excel hay un botón **"⬇ Descargar CSV"** en la pantalla de **Transacciones** (visible solo para Admin y Maestro).

Pasos:
1. Entra a **Transacciones** → click en **"⬇ Descargar CSV"**.
2. Elige el **tipo de reporte**:
   - **Resumen por ítem** — agregado por producto. Máximo 2 filas por producto: una con el resumen de **consumo** (lo que se vendió) y otra con el resumen de **compras** (lo que entró por proveedor). Cada fila trae cantidad total, valor total, **costo total**, **margen total y porcentual** (solo en filas de venta), precio promedio, número de transacciones y rango de fechas. **Los traslados se excluyen** porque son movimientos internos, no consumo ni compra real.
   - **Historial por transacción** — una fila por **cada** transacción (incluyendo traslados) con resumen de productos y total. Útil para listado completo de operaciones.
3. Elige **fecha inicial** y **fecha final** (zona horaria Bogotá). Por defecto trae el mes actual.
4. Click en **Descargar**. Se baja un archivo `.csv` que se abre directamente en Excel/Numbers/Google Sheets.

> **Límite:** rango máximo de 2 años por descarga. Si necesitas más, hazlo en varias descargas.
>
> **Tip:** el CSV trae acentos y ñ correctamente (UTF-8 con BOM). Si abres el archivo y ves caracteres raros, asegúrate de abrirlo con doble click — no copies/pegues el contenido.

### Diariamente
- Revisa la pestaña Alertas del Dashboard.
- Confirma que todas las ventas del día se registraron (preguntale a recepción si tienen anotaciones pendientes para subir por CSV).

### Semanalmente
- Revisa "Días estimados de stock" para programar compras.
- Revisa el reporte de transacciones por usuario (filtra por usuario y fecha) para detectar si algún empleado tiene comportamiento anómalo.

### Mensualmente
- **Cierre del mes**:
    - Hacer conteo físico de los productos de mayor valor (bebidas alcohólicas, bolas de pádel).
    - Hacer ajustes de inventario donde haya diferencia con motivo "Conteo físico".
    - Revisar el Dashboard del mes vs el anterior.
    - Identificar productos sin movimiento (stock alto, ventas 0) para considerar descontinuarlos.

### Trimestralmente
- Cambiar las contraseñas del personal por seguridad.
- Revisar la lista de usuarios y desactivar los que ya no trabajen.
- Revisar y actualizar costos unitarios si los proveedores cambiaron precios.

---

## 10. Soporte técnico y respaldos

### Respaldos
La base de datos está en **Supabase**, que hace respaldos automáticos diarios incluidos en el plan gratuito. No requieres hacer backup manual.

### Hosting
El sistema está alojado en **Vercel** (gratis para el volumen actual). Si en el futuro el club crece mucho y se necesita un plan pago, el costo es de USD 20/mes.

### Soporte
- **Soporte correctivo**: incluido por **15 días calendario** después de la entrega. Cualquier bug del desarrollo se corrige sin costo.
- **Después del periodo gratuito**: los ajustes y nuevas funcionalidades se cotizan aparte.
- **Contacto del proveedor**: César Emilio Castaño Marin — cesarxemiliox@gmail.com — +52 812 346 6691.

### Cómo reportar un problema
1. Captura la pantalla con el error.
2. Anota qué intentabas hacer (paso a paso).
3. Indica desde qué cuenta lo intentaste.
4. Envía el reporte al proveedor por WhatsApp o email.

---

_Última actualización: 25 de abril de 2026._
