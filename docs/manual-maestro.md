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

## 5. Gestión de listas de precios

### Concepto

Una "lista de precios" es un canal de venta con sus propios precios. Permite que el mismo producto se cobre diferente según a quién se le venda.

### Listas precargadas

| Código | Nombre | Para qué |
|--------|--------|----------|
| `DETAL` | Detal (default) | Precio público al cliente final |
| `EQUIPO_PRIME` | Equipo Prime | Miembros del equipo del club con descuento |
| `KEVIN_GARCIA` | Kevin García | Profesor externo |
| `BRYAN_PERAFAN` | Bryan Perafán | Profesor externo |
| `ALTERNO_1` ... `ALTERNO_8` | Alternos 1-8 | Reservados para nuevos canales |

### Casos de uso

**1. Llega un profesor nuevo (ej. "Pedro López")**
- Editas una de las listas Alterno: cambias nombre a "Pedro López" y código a `PEDRO_LOPEZ`.
- En cada producto/clase relevante, vas a su ficha → "Precios por lista" → asignas el precio especial para Pedro López.
- Cuando recepción venda una clase con Pedro López, modifica manualmente el precio (lo cambia del Detal al precio especial).

**2. Cambia el descuento del Equipo Prime**
- Ve a cada producto que aplica → ficha → "Precios por lista" → actualiza el precio Equipo Prime.
- Las ventas anteriores conservan el precio que tenían cuando se registraron (no se afectan).

**3. Un profesor ya no trabaja en el club**
- Vas a `/listas-precios` → click "Editar" en su lista → cambias el estado a **Inactiva**.
- O si es un profesor que no volverá, click "Eliminar". Si tiene precios asignados se desactiva en lugar de borrarse (preserva el histórico).

### ¿Cuándo NO usar listas de precios?

Si todos tus productos se venden a un solo precio público, **ignora esta función**. Solo usa Detal y olvídate de las demás. La función es opcional para casos especiales.

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

- **Consumo por mes**: visión general de tendencia.
- **Top productos**: cuáles son los productos estrella. Útil para saber qué stockear más y qué productos podrías negociar mejor con el proveedor.
- **Por categoría**: qué tipo de productos genera más ingresos.
- **Días de la semana**: identifica los días de mayor venta. Sirve para programar personal y compras.
- **Días estimados de stock**: 🔴 productos a punto de agotarse. **Revisa esta sección semanalmente** para evitar quiebres de stock.

### Pestaña "Inventario"

- **Stock por ubicación**: detecta si hay desbalance (ej. mucho stock en Bodega y poco en Vitrina → mover).
- **SKUs por categoría**: salud del catálogo.

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

### Un usuario está bloqueado / no puede entrar

Pasos:
1. Verifica que su cuenta esté activa en `/usuarios`.
2. Si no recuerda contraseña, "Reset pw" para generar una nueva.
3. Si el problema persiste, verifica que esté escribiendo el usuario correcto (sin acentos).

---

## 9. Mantenimiento y rutinas mensuales

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
