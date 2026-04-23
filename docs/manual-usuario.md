# Manual de usuario — ERP Prime Padel

**Versión MVP — abril 2026**
_Este manual se actualiza a medida que se liberan nuevas funciones. Las secciones marcadas con 🔜 corresponden a la versión completa (disponible en la entrega final)._

---

## ¿Qué es el ERP Prime Padel?

Es el sistema web del club para **controlar el inventario, registrar las ventas y compras del día, y entender cómo se comporta el consumo de los productos y servicios**.

Funciona en cualquier computador, tablet o celular con navegador. No se instala nada.

**Dirección del sistema:** _(a completar con la URL de producción)_

**Equipo que lo utiliza:**
- Personal de caja: registra ventas y compras.
- Administración: revisa el dashboard, configura productos y gestiona el inventario.

---

## Índice

1. [Primeros pasos](#1-primeros-pasos)
2. [Pantalla principal](#2-pantalla-principal)
3. [Inventario — ver, crear, editar y eliminar productos](#3-inventario)
4. [Detalle de un producto y ajuste de inventario](#4-detalle-de-un-producto)
5. [Transacciones — registrar una venta o compra](#5-transacciones)
6. [Ubicaciones](#6-ubicaciones)
7. [Categorías](#7-categorías)
8. [Dashboard](#8-dashboard)
9. [Preguntas frecuentes](#9-preguntas-frecuentes)

---

## 1. Primeros pasos

1. Abre el navegador (Chrome, Edge, Safari).
2. Ingresa la dirección del sistema.
3. Aparece la pantalla principal con los accesos.

> 🔜 En la versión completa vas a iniciar sesión con usuario y contraseña (admin o cajero).

---

## 2. Pantalla principal

Al abrir el sistema ves:
- **Barra superior** con el logo Prime Padel y los accesos: Inventario, Transacciones, Dashboard, Ubicaciones, Categorías.
- **Tarjetas de resumen**: cuántos productos activos hay, el stock total, alertas de stock bajo, transacciones registradas.
- **Accesos directos** a cada módulo.

Desde aquí entras a cualquier parte del sistema con un clic.

---

## 3. Inventario

Esta es la pantalla más usada por el administrador. Muestra **todos los productos y servicios** del club.

### ¿Qué ves en la tabla?
Cada fila es un ítem con:
- **Código** (SKU de Alegra o el que definas).
- **Nombre** del producto o servicio.
- **Categoría**.
- **Tipo**: si es un producto físico (con stock) o un servicio (sin stock).
- **Stock** total sumando todas las ubicaciones.
- **Precio detal** (el de venta al cliente final).
- **IVA** aplicable, como referencia.
- **Estado**: OK (verde), Stock bajo (amarillo), Sin stock (rojo), Inactivo (gris).

### Filtros disponibles

En la parte superior de la lista hay una caja de filtros:
- **Buscar**: escribe parte del nombre o del código.
- **Categoría**: selecciona una o varias (selección múltiple).
- **Ubicación**: filtra solo los productos que tengan stock en esa(s) ubicación(es).
- **Tipo**: producto, servicio, todos.
- **Estado de stock**: con stock, stock bajo, sin stock.
- **Activo / Inactivo**: por defecto solo muestra los activos.
- **Cantidad mínima / máxima**: rango de unidades en stock.

Los filtros se combinan entre sí. El número "Mostrando X de Y ítems" te avisa cuántos quedan visibles.

### Crear un ítem nuevo

1. Clic en **"+ Nuevo ítem"** (arriba a la derecha).
2. Llena el formulario:
   - **Nombre** (obligatorio).
   - **Código** (opcional, pero recomendado; único si lo pones).
   - **Tipo**: producto o servicio. Los servicios nunca manejan stock.
   - **Categoría**: elígela o deja "sin categoría".
   - **Stock mínimo**: cantidad por debajo de la cual el sistema te alerta.
   - **Costo unitario**: lo que le cuesta al club (para calcular el valor del inventario).
   - **Impuesto**: IVA 19%, Impoconsumo 8%, Sin impuesto. Es solo informativo.
   - **Precios por lista**: puedes llenar varios precios al mismo producto (Detal, Equipo Prime, precios especiales para profesores). Deja en 0 o en blanco los que no apliquen.
   - **Marca, modelo, referencia de fábrica, código de barras**: opcionales.
3. Clic en **"Guardar"**.

### Editar un ítem
Desde el detalle (ver sección 4), botón **"Editar"**.

### Eliminar un ítem
Desde el detalle, botón **"Eliminar"** y confirmación.
- Si el producto tiene histórico de ventas o transacciones, el sistema **no lo borra**: lo marca como **inactivo** para preservar los registros. Siempre puedes reactivarlo cambiando su estado.

---

## 4. Detalle de un producto

Al hacer clic en el nombre de un producto en la lista, se abre su ficha:

- **Encabezado**: nombre, código, categoría, impuesto aplicable.
- **Tarjetas resumen**: stock total, costo unitario, valor total en costo, precio de venta Detal.
- **Stock por ubicación**: tabla con cada lugar físico y su cantidad.
- **Precios**: todos los precios cargados, por lista.
- **Histórico de ventas mensuales**: cuánto se vendió cada mes (datos migrados desde Alegra).
- **Historial de ajustes**: cada vez que se hizo un conteo físico o corrección, con fecha, motivo y cantidad antes/después.

### Ajuste de inventario (importante)

Esta es la herramienta que usa el administrador cuando:
- Hace un **conteo físico** del producto.
- Detecta una **merma** (producto vencido, dañado).
- Registra una **rotura**.
- Hace una **corrección manual** del stock.
- Carga el **inventario inicial** por primera vez.

**Cómo usarla:**
1. En el detalle del producto, clic en **"Ajuste de inventario"**.
2. Selecciona la **ubicación** donde vas a ajustar.
3. Escribe la **cantidad nueva** (lo que realmente hay en ese sitio).
4. El sistema muestra automáticamente la **diferencia** (positiva si aumentó, negativa si disminuyó).
5. Escoge el **motivo**: conteo físico, merma, rotura, corrección, ingreso inicial, otro.
6. Agrega **notas** si quieres (ej: "Conteo del lunes en la mañana").
7. Clic en **"Registrar ajuste"**.

El sistema guarda un registro permanente del ajuste para auditoría.

> **Regla importante:** la cantidad total del producto siempre es la suma de las cantidades en cada ubicación. Si cambias una ubicación, el total se recalcula solo.

---

## 5. Transacciones

Es el módulo del día a día del cajero. Registra ventas, compras y las visualiza en una lista.

### Registrar una venta

1. Clic en **"+ Nueva transacción"**.
2. En la parte superior elige **"Venta"** (botón seleccionado en naranja).
3. En el buscador, escribe el producto o servicio que se vendió.
4. Selecciónalo de la lista desplegable: se agrega como línea de la venta.
5. Ajusta si es necesario:
   - **Ubicación de origen**: desde dónde sale el stock (Nevera Barra, Bodega, etc.). Al lado del nombre verás cuánto hay disponible.
   - **Cantidad**.
   - **Precio unitario**: se llena solo con el precio Detal, puedes modificarlo si aplica un descuento.
6. Repite para más productos de la misma venta.
7. Puedes agregar **notas** (cliente, mesa, número de factura, etc.).
8. Clic en **"Registrar venta"**.

**Validación automática:** si no hay suficiente stock en la ubicación elegida, el sistema te avisa en rojo y no deja registrar la venta hasta que corrijas.

### Registrar una compra / ingreso

Mismo flujo que la venta, pero eliges **"Compra / Ingreso"**. En este caso seleccionas la **ubicación de destino** (dónde entra el stock).

### Ver la lista de transacciones
La tabla muestra fecha, tipo (venta/compra), ítems, total y notas de las últimas 100 transacciones.

### Eliminar una transacción
Clic en "Eliminar" en la fila correspondiente.
- El sistema pregunta para confirmar.
- Al confirmar, **revierte automáticamente el movimiento de stock** (si era venta, devuelve el stock; si era compra, lo saca). Queda registro del ajuste de reversa en el producto correspondiente.

> 🔜 En la versión completa: edición directa de transacciones, carga masiva de transacciones por archivo CSV (útil para registros del fin de semana), filtros por rango de fechas y por producto.

---

## 6. Ubicaciones

Pantalla donde defines los lugares físicos donde se guarda el inventario.

### Ubicaciones incluidas por defecto
- Bodega Principal
- Nevera Barra
- Nevera Cajero
- Barra Cajero
- Vitrina
- Oficina
- Otro

### Crear una nueva ubicación
1. Clic en **"+ Nueva ubicación"**.
2. Llena:
   - **Nombre** (único).
   - **Tipo**: bodega, nevera, barra, vitrina, oficina, otro.
   - **Descripción** (opcional).
   - **Orden**: número para ordenar en las listas desplegables.
   - **Estado**: activa o inactiva.
3. Guardar.

### Editar o eliminar
Botones en cada fila.
- **Proteccción contra borrado**: si una ubicación tiene stock o transacciones, se marca como inactiva en vez de borrarse.

---

## 7. Categorías

Similar a Ubicaciones. Aquí defines los grupos de productos/servicios.

**Categorías cargadas:** 16 categorías normalizadas a partir del catálogo migrado desde Alegra (Bebidas con alcohol, Bebidas gaseosas, Cafetería, Implementos para pádel, Clases y paquetes Prime Padel, etc.).

El CRUD funciona igual que Ubicaciones. Soft-delete si la categoría tiene productos asociados.

---

## 8. Dashboard

La pantalla de inteligencia de negocio. Muestra:

### KPIs principales
- **Productos activos** totales y cuántos son inventariables.
- **Ubicaciones** activas.
- **Stock total** en unidades físicas.
- **Valor del inventario** en pesos (a costo).
- **Alertas de stock**: productos bajo mínimo.
- **Variación vs mes anterior** (% en monto).

### Filtros globales
- **Categoría** (multi-selección).
- **Métrica**: ver las gráficas en monto ($ COP) o en cantidad (unidades).

### Gráficas disponibles en el MVP
- **Consumo por mes** — barras de OCT 2025 a ABR 2026.
- **Top 10 productos más vendidos** — barras horizontales.
- **Consumo por categoría** — gráfica de torta.
- **Tendencia mensual** — línea dual: cantidad y monto en el mismo gráfico.

### Alertas de stock bajo
Si hay productos en mínimo o cero, aparece una sección llamando la atención. Desde Inventario puedes filtrar por "Stock bajo" / "Sin stock" para ver cuáles son y reponerlos.

> 🔜 En la versión completa: gráficas por día de la semana, leyendas colapsables, pestañas separadas (inventario / ventas / alertas), filtro por rango de fechas preciso.

---

## 9. Preguntas frecuentes

**¿Qué pasa con los servicios (clases, alquileres, torneos)?**
No tienen stock. El sistema los guarda como ítems vendibles pero nunca descuenta cantidades. Aparecen en las transacciones con su precio y suman al total, pero no afectan el inventario.

**¿Y los productos “no inventariables”?**
Son productos físicos que decides no trackear (ej: "Producto genérico" para ventas manuales sin SKU). Se comportan como servicios: puedes venderlos pero no se les lleva stock.

**¿Por qué algunos productos aparecen como inactivos?**
Porque corresponden a ítems del histórico (clases con profesores que ya no están, paquetes descontinuados). Se preservan para que las estadísticas históricas sigan siendo coherentes, pero no salen en los selectores del cajero.

**Si me equivoco al registrar una venta, ¿se puede corregir?**
Sí. Puedes eliminar la transacción desde la lista de Transacciones; el sistema revierte automáticamente el stock. Luego registras la correcta.

**¿Cómo hago el conteo físico del fin de mes?**
Producto por producto: abre su detalle → "Ajuste de inventario" → elige la ubicación → digita lo que realmente hay → motivo "Conteo físico" → guarda. El sistema muestra la diferencia con lo que tenía registrado, para que sepas si hubo merma, robo o error.

**¿Cómo se actualiza la lista de precios?**
Desde el detalle del producto, botón "Editar", sección "Precios por lista". Puedes modificar el Detal, el de Equipo Prime, o los precios especiales.

**¿Qué hago si un producto nuevo llega al club?**
Inventario → "Nuevo ítem" → llena los datos → guarda. Luego entra a su detalle → "Ajuste de inventario" → motivo "Ingreso inicial" → registras cuántos llegaron y a qué ubicación.

---

_Este manual se irá ampliando a medida que se liberen las funciones de la versión completa (login, carga CSV, gráficas avanzadas, etc.)._

_Última actualización: 23 de abril de 2026._
