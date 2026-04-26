# Manual de usuario — ERP Prime Padel

**Versión completa — abril 2026**
_Sistema web para gestión de inventario, ventas, compras, traslados y análisis del club Prime Padel._

---

## Índice

1. [¿Qué es el ERP Prime Padel?](#1-qué-es-el-erp-prime-padel)
2. [Roles del personal](#2-roles-del-personal)
3. [Cómo entrar al sistema (login)](#3-cómo-entrar-al-sistema)
4. [Pantalla principal](#4-pantalla-principal)
5. [Inventario — productos y servicios](#5-inventario)
6. [Detalle de un producto y ajuste de inventario](#6-detalle-de-un-producto)
7. [Transacciones — ventas, compras y traslados](#7-transacciones)
8. [Carga masiva de transacciones (CSV)](#8-carga-masiva-csv)
9. [Ubicaciones](#9-ubicaciones)
10. [Categorías](#10-categorías)
11. [Listas de precios](#11-listas-de-precios)
12. [Dashboard — análisis del negocio](#12-dashboard)
13. [Usuarios](#13-usuarios)
14. [Preguntas frecuentes](#14-preguntas-frecuentes)

---

## 1. ¿Qué es el ERP Prime Padel?

Es la plataforma web del club para **controlar el inventario, registrar ventas/compras/traslados y entender cómo se comporta el negocio día a día**.

Funciona en cualquier computador, tablet o celular con navegador. No se instala nada.

**URL del sistema:** https://erp-prime-padel.vercel.app/

**Equipo que la utiliza:**
- **Recepción / Caja:** registra ventas y traslados.
- **Administración:** gestiona inventario, ubicaciones, registra compras y traslados.
- **Maestro (dueño):** acceso total — configura el sistema, ve análisis financieros, gestiona usuarios.

---

## 2. Roles del personal

El sistema tiene **tres niveles de acceso** según las responsabilidades del usuario:

| Acción | Maestro | Admin | Recepción |
|--------|:-------:|:-----:|:---------:|
| Registrar venta | ✅ | ✅ | ✅ |
| Registrar traslado entre ubicaciones | ✅ | ✅ | ✅ |
| Registrar compra (entrada de stock) | ✅ | ✅ | ❌ |
| Carga masiva por CSV | ✅ | ✅ | ✅ (solo ventas y traslados) |
| Editar / eliminar sus propias transacciones del día | ✅ | ✅ | ✅ |
| Editar / eliminar transacciones de otros usuarios | ✅ | ✅ (excepto del Maestro) | ❌ |
| Editar / eliminar transacciones de días pasados | ✅ | ✅ (excepto del Maestro) | ❌ |
| Ver inventario | ✅ | ✅ | ❌ |
| Crear / editar productos | ✅ | ✅ | ❌ |
| Editar costos y precios | ✅ | ❌ | ❌ |
| Eliminar productos | ✅ | ❌ | ❌ |
| Ajuste de inventario (conteo, merma, etc.) | ✅ | ✅ | ❌ |
| Gestionar Ubicaciones | ✅ | ✅ | ❌ |
| Gestionar Categorías | ✅ | ❌ | ❌ |
| Gestionar Listas de precios | ✅ | ❌ | ❌ |
| Ver Dashboard | ✅ | ❌ | ❌ |
| Gestionar Usuarios | ✅ | ❌ | ❌ |

> Cada acción que se hace en el sistema queda registrada con el usuario que la hizo y la fecha/hora exactas — auditoría completa para revisar después si algo no cuadra.

---

## 3. Cómo entrar al sistema

1. Abre tu navegador (Chrome, Edge, Safari) e ingresa a `https://erp-prime-padel.vercel.app/`.
2. Aparece la pantalla de **Ingreso**.
3. Escribe tu **Usuario** (no es un correo, es un nombre como `recepcion1` o `admin`).
4. Escribe tu **Contraseña**.
5. Click en **Ingresar**.

El usuario no distingue mayúsculas/minúsculas (`recepcion1` y `RECEPCION1` son lo mismo). La contraseña sí es estricta.

**Si te equivocas o no recuerdas la contraseña**, contacta al Maestro: él puede restablecerla desde la pantalla de Usuarios.

**Cerrar sesión:** click en el avatar arriba a la derecha → **Cerrar sesión**.

---

## 4. Pantalla principal

Al ingresar ves:
- **Saludo personal** con tu nombre y rol (MAESTRO, ADMIN o RECEPCIÓN).
- **Tarjetas de resumen**: cuántos productos hay, stock total actual, valor del inventario (solo Maestro), alertas de stock bajo, transacciones registradas.
- **Tarjetas de acceso** a cada módulo al que tienes permiso.
- **Barra superior** con el logo Prime Padel y los links a cada módulo. En celular se compacta a un menú hamburguesa (☰).

---

## 5. Inventario

> 👤 **Acceso:** Maestro y Admin.

Lista todos los productos y servicios del club.

### Tabla principal

Cada fila muestra:
- **Código** (SKU del producto).
- **Nombre**.
- **Categoría**.
- **Tipo**: Producto (físico, con stock) o Servicio (clases, alquileres, sin stock).
- **Stock** total (suma de todas las ubicaciones).
- **Precio detal**.
- **IVA** aplicable.
- **Estado**: 🟢 OK, 🟡 Stock bajo, 🔴 Sin stock, ⚪ Inactivo, — (no aplica).

### Filtros

Buscar, Categoría (multi), Ubicación, Tipo, Estado de stock, Activo/Inactivo, Cantidad mín/máx + botón **Limpiar filtros**.

La tabla muestra 10 productos por página con paginador.

### Crear un ítem nuevo

1. Click en **"+ Nuevo ítem"**.
2. Llena el formulario:
   - **Nombre** (obligatorio).
   - **Código (SKU)** (opcional, recomendado, único si lo usas).
   - **Tipo**: Producto o Servicio. Si es Servicio, varios campos se ocultan automáticamente.
   - **Categoría**.
   - **¿Se inventaría?** (solo productos físicos): si es No, se vende pero no descuenta stock.
   - **Stock mínimo** (alerta).
   - **Costo unitario** (solo Maestro): para calcular valor del inventario.
   - **Impuesto** (informativo): default "Sin impuesto".
   - **Unidad de medida**.
   - **Marca, modelo, código de barras** (opcionales, solo productos).
   - **Estado**: Activo o Inactivo.
   - **Precios por lista** (solo Maestro).
3. Click en **Guardar**.

### Editar / eliminar
- Desde la ficha del producto, botón **Editar** (Maestro y Admin).
- **Eliminar** solo aparece para el Maestro. Si el producto tiene histórico, se marca como inactivo.

---

## 6. Detalle de un producto

Click en el nombre del producto → ficha con:

- **Encabezado**: nombre, código, categoría, impuesto.
- **Tarjetas resumen**: stock total, costo unitario, valor total en costo, precio Detal.
- **Stock por ubicación**: tabla con cada lugar físico y su cantidad.
- **Precios por lista**: todos los precios cargados según el canal.
- **Histórico de ventas mensuales**: cantidad y monto vendido cada mes (datos de Alegra). Los totales con asterisco (*) son estimados con el precio actual cuando el reporte original no traía monto.
- **Historial de ajustes**: cada conteo físico, merma o corrección registrada.

### Ajuste de inventario

Esta es la herramienta que se usa cuando:
- Haces un **conteo físico**.
- Detectas una **merma** (vencido, dañado).
- Registras una **rotura**.
- Haces una **corrección manual** del stock.
- Cargas el **inventario inicial** por primera vez.

**Cómo usarla:**
1. En la ficha del producto, click **"Ajuste de inventario"**.
2. Selecciona la **ubicación**.
3. Escribe la **cantidad nueva** (lo que realmente hay).
4. El sistema calcula la **diferencia** automáticamente.
5. Escoge el **motivo**: conteo físico / merma / rotura / corrección / ingreso inicial / otro.
6. Agrega **notas** si quieres.
7. Click **Registrar ajuste**.

> **Regla:** la cantidad total del producto siempre es la suma de las cantidades en cada ubicación. Si cambias una ubicación, el total se recalcula solo.

---

## 7. Transacciones

Es el módulo del día a día.

### Tipos de transacción

- **Venta**: sale stock de una ubicación. Precio = lo que paga el cliente.
- **Compra** (Maestro y Admin): entra stock a una ubicación. Precio = costo unitario al proveedor.
- **Traslado**: mueve stock entre dos ubicaciones del club. No es ingreso ni egreso.

### Lista de transacciones

Tabla con filtros por:
- **Tipo** (todas / ventas / compras / traslados — recepción no ve compras).
- **Fecha desde / hasta**.
- **Categoría** (multi).
- **Producto** (multi).
- Botón **Limpiar filtros**.

Cada fila: fecha y hora exactas, tipo, **quién registró**, ítems, total, notas, botones de acciones (visibles según permisos). 10 transacciones por página.

### Registrar una venta

1. Click **"+ Nueva transacción"**.
2. Botón **Venta** seleccionado por defecto.
3. Buscador de productos (con autoenfoque).
4. Click en el producto → se agrega como línea.
5. Por cada línea ajusta:
    - **Ubicación de origen** (al lado del nombre se ve cuánto hay disponible).
    - **Cantidad**.
    - **Precio venta**: se autocompleta con el precio Detal, puedes modificarlo si aplica un descuento o un precio especial (ej. Equipo Prime).
6. Repite para más productos. **Puedes agregar el mismo producto dos veces si vendes desde ubicaciones distintas** (ej. 3 cervezas de Nevera + 2 de Vitrina).
7. Agrega **Notas** (mesa, cliente, factura, etc.).
8. Click **Registrar venta**.

**Validación automática:** si no hay suficiente stock en la ubicación elegida, el sistema avisa en rojo y no deja registrar.

### Registrar una compra

Igual flujo, eligiendo el botón **"Compra / Ingreso"**. El precio se autocompleta con el **costo unitario** del producto (lo que pagaste al proveedor) y la ubicación es de **destino**.

### Registrar un traslado

Eliges **"Traslado"**, agregas el producto, y para cada línea seleccionas **dos ubicaciones**: origen y destino. Validaciones: origen ≠ destino, stock suficiente en origen.

### Editar y eliminar

- Click **Editar** → abre el diálogo con los datos cargados.
- Cambia lo que necesites y guarda.
- Si la nueva versión falla por algún motivo, el sistema **automáticamente restaura la transacción original** sin que pierdas datos.
- Click **Eliminar** → confirmación → el stock se revierte automáticamente y queda registro del ajuste de reversa en cada producto.

---

## 8. Carga masiva CSV

Útil para cargar varias transacciones de un golpe (ej. el resumen de ventas del fin de semana).

> 👤 **Acceso:** Maestro y Admin (todas). Recepción puede subir solo ventas y traslados.

### Flujo

1. Entra a **Transacciones → "⬆ Carga masiva (CSV)"**.
2. Descarga la plantilla CSV (ya trae las columnas correctas con ejemplos).
3. Llena el archivo en Excel:
    - Columnas obligatorias: `fecha, tipo, codigo_producto, ubicacion, cantidad, precio_unitario`.
    - Opcionales: `notas, ticket`.
    - Borra las líneas que empiezan con `#` (son comentarios).
4. Arrastra el archivo o selecciónalo.

### Reglas del archivo

- **fecha**: `DD/MM/AAAA`, `DD-MM-AAAA` o `AAAA-MM-DD`. Opcional con hora: `DD/MM/AAAA HH:MM`.
- **tipo**: `venta` o `compra` (recepción no puede subir compras).
- **codigo_producto**: el SKU exacto del producto.
- **ubicacion**: nombre exacto de la ubicación.
- **cantidad**: entero positivo.
- **precio_unitario**:
    - En **ventas** = precio que pagó el cliente.
    - En **compras** = costo unitario al proveedor.
- **ticket** (opcional): rows con el mismo ticket se agrupan en una sola transacción con varios ítems.

### Preview con validación

- **Filas verdes**: válidas, listas para importar.
- **Filas rojas**: con errores específicos (código no existe, stock insuficiente, ubicación errada, servicio no admite compra, etc.).

**No se puede importar si hay filas rojas** — corriges el CSV y vuelves a subir.

Cuando todo está verde, click **"Confirmar e importar"**. Las transacciones aparecen marcadas con un badge **CSV** en la lista.

---

## 9. Ubicaciones

> 👤 **Acceso:** Maestro y Admin.

Lugares físicos donde se guarda el inventario.

**Ubicaciones precargadas:** Bodega Principal, Nevera Barra, Nevera Cajero, Barra Cajero, Vitrina, Oficina, Otro.

**Crear / editar / eliminar:**
- **+ Nueva ubicación**: nombre (único), tipo (bodega/nevera/barra/etc.), descripción, **orden** (número que define en qué posición aparece en los dropdowns), estado.
- **Eliminar**: si tiene stock o transacciones, se marca como inactiva.

> **Tip:** el campo "Orden" se usa para acomodar el dropdown de ubicaciones cuando registras una venta. Las que más se usan deberían tener orden bajo (1, 2, 3...).

---

## 10. Categorías

> 👤 **Acceso:** Maestro.

Grupos de productos/servicios.

**16 categorías precargadas** desde el catálogo de Alegra (Bebidas con alcohol, Cafetería, Implementos para pádel, Clases y paquetes Prime Padel, etc.).

CRUD igual a ubicaciones. Soft-delete si la categoría tiene productos asociados.

---

## 11. Listas de precios

> 👤 **Acceso:** Maestro.

Permite que un mismo producto tenga **precios distintos según el canal o destinatario**.

### ¿Qué son?

Imagina la siguiente tabla:

| Producto | Detal (público) | Equipo Prime | Profesor Kevin | Profesor Bryan |
|----------|:---:|:---:|:---:|:---:|
| Botella agua | $4.000 | $3.000 | — | — |
| Clase 1h | $80.000 | — | $70.000 | $75.000 |

Cada columna es una "lista de precios". Permite que el mismo producto se cobre distinto según el cliente.

**Listas precargadas:**
- **Detal** (default — la que se usa por defecto en cada venta).
- Equipo Prime, Pro Team.
- Kevin García, Bryan Perafán (profesores).
- Alterno 1 al 8 (reservados para nuevos canales).

### Cómo gestionar
- **Crear**: + Nueva lista → nombre + código interno (ej. `PEDRO_LOPEZ`) + orden + estado.
- **Editar**: cambiar nombre, código, orden o desactivar.
- **Eliminar**: si tiene precios asociados se desactiva en lugar de borrar. **Detal no se puede borrar**.

### Cómo se usa
1. **Maestro**: en la ficha del producto → sección "Precios por lista" → asigna el precio para cada canal que aplique. Las listas que no apliquen se dejan en blanco.
2. **Cajero**: cuando registra una venta, el precio se autocompleta con Detal. Si está vendiendo a un Equipo Prime, modifica manualmente el precio.

> Si no manejas precios diferenciados, ignora esta función — todo se vende a precio Detal por defecto.

---

## 12. Dashboard

> 👤 **Acceso:** Maestro.

La pantalla de inteligencia del negocio. **Tres pestañas:**

### KPIs siempre visibles (arriba)
Productos activos, ubicaciones, stock total, valor del inventario, alertas, variación vs mes anterior.

### Pestaña "Ventas y consumo"
- **Filtros**: categoría (multi), Mes desde, Mes hasta.
- **Consumo por mes** (gráfica de barras, monto).
- **Top productos** (paginado, ordenable por monto o cantidad).
- **Consumo por categoría** (torta, con leyenda colapsable).
- **Ventas por día de la semana** (cuando hay transacciones reales).
- **Top 5 productos por día** (gráfica apilada).
- **Tabla paginada con TODAS las cantidades vendidas**.
- **Días estimados de stock** (predictivo): cuántos días faltan para que se acabe cada producto según la velocidad de venta histórica. Sugerencias 🔴 comprar ya, 🟡 programar compra, 🟢 OK.

### Pestaña "Inventario"
- **Stock por ubicación**: gráfica + tarjetas con cantidad y valor en costo de cada ubicación.
- **Productos por categoría**: cuántos SKUs tiene cada categoría.

### Pestaña "Alertas"
- Tabla paginada de productos con stock bajo o agotado.
- Cada fila: código, nombre, categoría, estado, stock total, mínimo, **chips por ubicación** (rojo si esa ubicación está en 0, amarillo si tiene ≤2). Si hay muchas ubicaciones, "+N más" expande/colapsa.
- Click en el nombre del producto → ficha del producto.

---

## 13. Usuarios

> 👤 **Acceso:** Maestro.

Gestiona las cuentas del personal del club.

**Tabla:** usuario, nombre, rol, estado, fecha de creación, último ingreso.

### Crear usuario
1. + Nuevo usuario.
2. Llena: nombre completo (descripción), usuario (3-30 caracteres, sin mayúsculas ni espacios), rol, contraseña (opcional).
3. Guardar → modal con las credenciales. **Cópialas y compártelas** — no se vuelven a mostrar.

### Otras acciones
- **Editar**: cambiar nombre, usuario o contraseña.
- **Reset pw**: genera una nueva contraseña aleatoria.
- **Cambiar rol**: con el dropdown directo en la fila.
- **Desactivar / Reactivar**: el usuario desactivado no puede ingresar pero su historial se conserva.

> No puedes desactivarte a ti mismo ni cambiarte el rol.

---

## 14. Preguntas frecuentes

**¿Qué pasa con los servicios (clases, alquileres, torneos)?**
No tienen stock. Se venden con su precio y suman al total, pero no afectan el inventario.

**¿Y los productos "no inventariables"?**
Productos físicos que decides no trackear (ej. promos genéricas). Se comportan como servicios.

**¿Por qué algunos productos aparecen como inactivos?**
Corresponden a ítems del histórico (clases con profesores que ya no están, paquetes descontinuados). Se preservan para que las estadísticas sigan siendo coherentes.

**Si me equivoco al registrar una venta, ¿se puede corregir?**
Sí. Click en **Editar** o **Eliminar** desde la lista de Transacciones (con permisos). El sistema revierte automáticamente el stock al eliminar.

**¿Cómo hago el conteo físico del fin de mes?**
Producto por producto: ficha → "Ajuste de inventario" → ubicación → cantidad real → motivo "Conteo físico" → guarda.

**¿Cómo cambio el precio de un producto?**
Maestro: ficha del producto → Editar → sección "Precios por lista".

**¿Qué pasa si cambio el precio de un producto?**
Las transacciones ya registradas guardan su precio original (no se afectan). El histórico mensual estimado sí se recalcula. Las nuevas ventas usan el precio actualizado por defecto.

**¿Qué hago si un producto nuevo llega al club?**
Inventario → "+ Nuevo ítem" → llena los datos. Luego en su ficha → "Ajuste de inventario" → motivo "Ingreso inicial" → registras cuántos llegaron y a qué ubicación.

**¿Qué pasa si olvido mi contraseña?**
Pídele al Maestro que entre a `/usuarios`, busque tu fila, y le dé click a **Reset pw**.

**¿Cómo veo qué hizo cada empleado?**
La lista de Transacciones muestra el usuario que registró cada operación con fecha y hora exacta. Filtra por fechas para ver lo de un día puntual.

**¿Puedo ver el sistema en el celular?**
Sí. El nav se compacta a un menú hamburguesa (☰) y las tablas tienen scroll horizontal.

---

_Última actualización: 25 de abril de 2026._
