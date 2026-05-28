# Guía de capacitación — Prime Padel ERP

Guion paso a paso para conducir la sesión de capacitación con el cliente. **Tú lees, ellos miran.** Cada sección dice qué demostrar, los clicks exactos y los puntos que vale la pena enfatizar (🎯).

- **URL:** https://erp-prime-padel.vercel.app/
- **Duración total sugerida:** ~90 min (incluyendo preguntas).
- **Audiencia esperada:** dueño/gerencia (Maestro), encargado operativo (Admin), 1-2 cajeros (Recepción).

---

## Pre-vuelo (haz esto 15 min antes)

- [ ] Abre 3 ventanas del navegador en paralelo (recomendado Chrome):
   1. **Ventana 1** → logueada como `maestro` (la principal donde demuestras).
   2. **Ventana 2** → de incógnito, lista para entrar como `admin` después.
   3. **Ventana 3** → de incógnito, lista para entrar como `recepcion1`.
- [ ] Verifica que ya corriste todas las migraciones en Supabase, incluida `migration-tx-actualizado.sql`.
- [ ] Verifica que hay **algo de stock cargado** (mínimo 3-4 productos con unidades). Si no, registra una compra rápido como `maestro` antes de empezar.
- [ ] Ten a la mano:
   - La hoja de **cuentas iniciales** (la del Manual Maestro, sección 2).
   - El [Manual de usuario](./manual-usuario.html) y el [Manual del Maestro](./manual-maestro.html) abiertos por si surge una pregunta puntual.
- [ ] **Apaga notificaciones** del computador para no interrumpir el screen-share.

---

## Estructura sugerida de la sesión

| # | Bloque | Tiempo | Rol |
|---|--------|:------:|-----|
| 1 | Introducción y mapa del sistema | 5 min | — |
| 2 | Configuración (catálogo) | 10 min | Maestro |
| 3 | Día a día: transacciones | 15 min | Maestro |
| 4 | Carga masiva CSV | 10 min | Maestro |
| 5 | Ficha del producto y ubicaciones | 10 min | Maestro |
| 6 | Dashboard | 15 min | Maestro |
| 7 | Descarga CSV de transacciones | 3 min | Maestro |
| 8 | Gestión de usuarios | 5 min | Maestro |
| 9 | Rol Admin — diferencias | 5 min | Admin |
| 10 | Rol Recepción — demo de caja | 7 min | Recepción |
| 11 | Limitaciones y soporte | 5 min | — |
| 12 | Q&A | el resto | — |

---

## 1. Introducción y mapa del sistema (5 min)

**Qué decir:**
- "Es un mini-ERP web hecho a medida para Prime Padel. Controla inventario y transacciones de las bebidas, mecato, bolas de pádel y demás productos del club."
- "Funciona desde cualquier navegador — no se instala nada. Pueden entrar desde el computador de caja, el celular o la oficina."
- "Hay 3 niveles de acceso (los explico ya). El **Maestro** ve todo, el **Admin** opera el día a día, y la **Recepción** es la pantalla más simple, pensada para el cajero."

**Qué mostrar:**
1. Abre la URL en la ventana del Maestro.
2. Apunta al **logo arriba a la izquierda** y al **avatar arriba a la derecha** (rol visible).
3. Pasea el cursor por el nav: "Transacciones, Inventario, Ubicaciones, Dashboard, Categorías, Tarifas, Usuarios — estas son las 7 secciones que ve el Maestro. Admin ve 3. Recepción ve solo 1."

🎯 **Cierra el bloque con:** "Todo lo que hagamos hoy queda registrado con el usuario y la hora. Nada se pierde."

---

## 2. Configuración del catálogo (10 min) — rol Maestro

> Este bloque solo lo hace una vez al inicio. Lo enseñas para que sepan dónde está, no para que lo modifiquen todo el tiempo.

### 2.1 Categorías

1. Click en **Categorías**.
2. Muestra la lista actual.
3. Click **+ Nueva categoría** → llena un ejemplo ("Demo CAT") → Crear.
4. Click **Editar** sobre la que acabas de crear → cambia el nombre.
5. Click **Eliminar** → confirma.

🎯 "Si la categoría tiene productos asociados, **no se borra**: se marca como **inactiva** para preservar el histórico."

### 2.2 Ubicaciones

1. Click en **Ubicaciones**.
2. Muestra la lista (Bodega Principal, Nevera Barra, etc.).
3. Click **+ Nueva ubicación** → llena (ej. "Demo UBIC", tipo "otro") → Crear.
4. **Click en el nombre** de cualquier ubicación con stock → "Esta es la ficha de la ubicación: cuántos productos hay, las unidades totales y el valor estimado al costo. Aquí pueden auditar qué hay físicamente en cada lugar."

🎯 "Tip: el campo **Orden** define en qué posición aparece en los dropdowns. Pongan **1, 2, 3...** en las que más usan."

### 2.3 Tarifas (precios diferenciados)

1. Click en **Tarifas**.
2. Muestra la tabla: Detal (default), Equipo Prime, Kevin García, Bryan Perafán, Alternos…
3. Explica: "Cada tarifa es un canal de venta con su precio. **Detal** es el precio público; las demás suelen ser descuentos para canales especiales."
4. Click **+ Nueva tarifa** → llena nombre `Demo Staff` / código `DEMO_STAFF` / descuento `15` % → Crear.
5. 🎯 "Fíjense en el descuento: **automáticamente todos los productos tendrán precio Staff = Detal × 0.85**, sin tener que configurar producto por producto."
6. Edita la tarifa que acabas de crear, cambia el descuento a 20%, guarda → "Cualquier cambio aquí se refleja al instante en todos los productos."
7. Elimínala al final del bloque para dejar limpio.

🎯 "Si un producto puntual tiene que llevar un precio Staff diferente (ni Detal − 20% ni nada calculado), eso se configura desde la ficha del producto. Lo veremos en un momento."

### 2.4 Productos (catálogo)

1. Click en **Inventario**.
2. Muestra la tabla con sus filtros (Categoría, Ubicación, Producto, rango de cantidad).
3. Click **+ Nuevo ítem** → llena los campos básicos:
    - Código: `DEMO-001`
    - Nombre: `Producto demo`
    - Tipo: Producto
    - Categoría: cualquiera
    - Costo unitario: `5000`
    - Stock mínimo de alerta: `5`
4. **Baja a la sección "Precios por tarifa"** → "Aquí ven todas las tarifas. La Detal la llenan a mano; las demás aparecen con `auto: $X` si tienen descuento configurado. Pueden poner un valor manual para anular el automático."
5. Llena Detal = `10000`. Observa cómo aparece el cálculo auto en las demás tarifas.
6. Guarda.
7. **Búscalo** en la lista y click en su nombre → muestra la ficha.
8. Click **Eliminar** → "Si tiene histórico, se marca como inactivo para no perder datos."

🎯 "El catálogo es la base de TODO. Si un producto no está aquí, no se puede vender ni comprar en el sistema."

---

## 3. Día a día — Transacciones (15 min) — rol Maestro

> Este es el bloque más importante. Asegúrate de demostrar cada tipo con calma.

### 3.1 Venta

1. Click en **Transacciones**.
2. Muestra la lista (las que ya existan).
3. Click **+ Nueva transacción** → botón **Venta** ya viene seleccionado.
4. Busca un producto que tenga stock (escribe parte del nombre) → click para agregarlo.
5. Por la línea, muéstrales:
    - **Ubicación de origen**: el dropdown muestra el stock disponible al lado.
    - **Cantidad**: pueden borrar y reescribir libremente; los miles se separan automáticamente.
    - **Precio venta**: 🎯 "Es un **dropdown con las tarifas** del producto. Si la venta es Detal, lo dejan en Detal. Si es Staff Prime, lo cambian aquí en un click. Si es un caso especial, eligen **'Otro'** y escriben el valor a mano."
    - **Subtotal**: se calcula solo.
6. Agrega un **segundo producto** distinto.
7. Agrega un **servicio** (clase de pádel, por ejemplo) en la misma transacción → "Los servicios no descuentan stock — pero la cobranza queda registrada igual."
8. Escribe una nota corta (ej. "Mesa 3").
9. Click **Registrar venta** → toast verde.
10. La transacción aparece en la lista con la fecha y el usuario.

🎯 "Importante: el **costo del producto se guarda automáticamente** en cada venta. Eso permite calcular margen real después, aunque cambien el costo en el catálogo."

### 3.2 Compra

1. Click **+ Nueva transacción** → **Compra / Ingreso**.
2. Busca un producto → agrégalo.
3. Por la línea: **Ubicación de destino** (Bodega Principal típicamente), **Cantidad**, **Costo unitario** (lo que pagaron al proveedor).
4. Agrega otra línea.
5. Notas: "Pedido proveedor XYZ".
6. Registrar.

🎯 "Es lo que usan cuando llega mercancía nueva. Sube el stock automáticamente y queda el costo para futuros cálculos."

### 3.3 Traslado

1. Click **+ Nueva transacción** → **Traslado**.
2. Busca un producto que tenga stock en Bodega → agrégalo.
3. Por la línea: **Origen** (Bodega), **Destino** (Nevera Barra), **Cantidad**.
4. 🎯 "Vean cómo el traslado **NO pide precio ni costo** — es solo mover stock entre dos lugares del club. El sistema dice cuántas unidades se van a mover, sin pesos."
5. Registrar.
6. Verifica en la lista que la transacción aparece con el badge "Traslado" y muestra `Bodega → Nevera Barra`.

### 3.4 Editar y eliminar — con limitaciones explícitas

1. En una **venta del día** de un cajero, demuestra **Editar**: cambia el precio → guarda. Toast verde.
2. Muestra cómo bajo la fecha aparece **"editado <fecha>"** y bajo "Registró" sale "editó: maestro".
3. 🎯 "El nombre que registró la venta NO cambia. Solo se anota quién y cuándo editó."
4. Intenta editar **una compra antigua**:
   - Si el stock todavía está disponible → permite cambiar cantidad y devolver al stock.
   - Si ya se vendió todo ese stock → 🎯 "Aquí van a ver un mensaje claro: el sistema **no puede dejar el stock en negativo**. Pero **sí pueden** editar el precio o costo de esa misma compra sin problema — eso no toca stock."
5. Demuestra **Eliminar** una venta del día → confirma → el stock se revierte automáticamente.

🎯 Refuerza: "Esto **protege la integridad del inventario**. No es un bug, es una salvaguarda."

---

## 4. Carga masiva CSV (10 min) — rol Maestro

> Bloque clave para el cliente: les ahorra muchísimo tiempo si la usan bien.

1. Click **Transacciones → ⬇ Cargar CSV**.
2. Click **⬇ Descargar plantilla CSV**.
3. Abre el archivo descargado en Excel (o ábrelo arrastrándolo).
4. 🎯 Muestra: "La plantilla viene **pre-llenada con TODOS los productos activos** de su catálogo. Cada fila trae el nombre, el código, una fecha, una ubicación sugerida y el precio o costo. **Lo único que tienen que hacer es escribir la cantidad** en las filas que efectivamente se movieron."
5. Demuestra: llena la cantidad de 2-3 productos (uno de venta, uno de compra, uno de traslado).
6. Guarda el archivo.
7. Vuelve al sistema, arrastra el archivo a la zona de drop → preview.
8. 🎯 Señala:
    - "X filas leídas, Y válidas, Z con error, **W ignoradas** (las que dejaron en 0)."
    - Si hay alguna fila en rojo: "Estas tienen un problema — código no existe, stock insuficiente, etc. Pero **las verdes se importan igual**; las rojas se omiten."
9. Click **Importar** → toast con el resumen.
10. Muestra las transacciones nuevas en la lista, marcadas con badge **CSV**.

🎯 Cierra con: "Esto es ideal para que recepción al final del turno suba un solo archivo con todas las ventas, en lugar de registrar una por una. Y la admin puede usarlo para descargar la plantilla, anotar las compras del proveedor en Excel, y subir todo de un golpe."

---

## 5. Ficha del producto y ubicaciones (10 min) — rol Maestro

### 5.1 Ficha de producto

1. Inventario → click en el nombre de un producto que ya tenga compras y ventas.
2. Pasea por la ficha **señalando cada tarjeta arriba**:
    - **Stock total** + alerta si baja.
    - **Costo promedio**: 🎯 "Calculado a partir de TODAS las compras del producto. Es el costo real que están pagando en promedio."
    - **Última compra**: cuándo y a qué costo entró el último pedido.
    - **Valor invertido**: cuánta plata han metido en el producto históricamente.
    - **Valor vendido**: cuánto han facturado vendiéndolo.
3. **Stock por ubicación**: "Solo aparecen las ubicaciones donde sí hay producto."
4. **Precios por tarifa**: "Aquí ven el precio efectivo en cada canal: si dice **Auto** es el cálculo automático del descuento; si dice **Manual** es un valor puntual que configuraron."
5. **Histórico de transacciones**: tabla paginada con TODAS las ventas, compras y traslados del producto. 🎯 "Si el costo promedio les parece raro, revísenlo aquí — pueden ver exactamente de qué compras salió."
6. **Histórico de ventas (mensual)**: "Combina los datos de Alegra que migramos con las ventas registradas en este sistema, mes a mes."
7. **Historial de ajustes**: conteos físicos, mermas, roturas y correcciones.

### 5.2 Ajuste de inventario

1. Click en **Ajuste de inventario** (botón arriba a la derecha de la ficha).
2. Selecciona ubicación → escribe la cantidad real → el sistema calcula la diferencia.
3. Motivo: **Conteo físico** (o merma/rotura/corrección según el caso).
4. Notas opcionales.
5. Registrar.

🎯 "Esto es lo que usan cuando hacen el inventario mensual y encuentran que el sistema dice 30 unidades pero físicamente hay 28: registran el ajuste con motivo 'Conteo físico'. Queda en el historial para auditoría."

### 5.3 Ficha de ubicación

1. Click en **Ubicaciones** del nav.
2. Click en cualquier ubicación con stock.
3. Muestra los 3 KPIs y la tabla.
4. 🎯 "Aquí pueden auditar: 'Bodega Principal debería tener X de tal producto — vamos a contar y comparar'."

---

## 6. Dashboard (15 min) — rol Maestro

### 6.1 Pestaña Ventas (la que se ve primero)

1. Recorre los **KPIs superiores**: Productos activos, Ubicaciones, Stock total, Valor inventario, Alertas activas.
2. Pasa por los **filtros**: Categoría, Producto, Mes (atajo), Fecha desde/hasta.
3. 🎯 "Los filtros aplican a las gráficas basadas en el histórico mensual (consumo por mes, top productos, por categoría, cantidades vendidas)."
4. Demuestra cada gráfica brevemente:
    - **Ventas última semana** → "Útil cada mañana para ver cómo viene la semana."
    - **Consumo por mes** → tendencia general.
    - **Top productos** → cambia el selector monto/cantidad. "Para saber qué stockear más."
    - **Consumo por categoría** → "Qué tipo de productos generan más ingresos."
    - **Ventas por día de la semana** → "Identificar los días pico para programar personal."
    - **Top 5 productos por día de la semana** → "Qué se vende cuándo."
    - **Cantidades vendidas por producto** → tabla completa con paginación.
    - **Utilidades brutas (costos vs ingresos)** → 🎯 "Esta es muy poderosa: aquí ven los productos más rentables. El costo se calcula con el **costo promedio de compra** del producto. Sirve para responder: '¿qué tan rentable es vender esto?'"

### 6.2 Pestaña Inventario

1. **Stock por ubicación** → gráfica + tarjetas con valor estimado al costo promedio.
2. **Productos por categoría** → "Salud del catálogo."
3. **Días estimados de stock** → 🎯 "Esta es para anticipar compras: les dice cuántos días les quedan de cada producto según la velocidad de venta histórica. Revísenla **semanalmente**."

### 6.3 Pestaña Alertas

1. Muestra la tabla de productos en alerta.
2. Demuestra los filtros (categoría + búsqueda).
3. 🎯 "Esta es su **lista de compras de la semana**. Click en cualquiera o en 'Ver' los lleva a la ficha para registrar la compra cuando llegue."

---

## 7. Descarga CSV de transacciones (3 min) — rol Maestro

1. Vuelve a Transacciones → **⬇ Descargar CSV**.
2. Demuestra los dos modos:
    - **Resumen por ítem** → "Por producto, con cantidad total, valor, costo, margen y margen %. Para análisis."
    - **Historial por transacción** → "Una fila por transacción. Para auditoría o pasar a contabilidad."
3. Elige un rango de fechas y descarga.

🎯 "El archivo abre directo en Excel/Google Sheets con acentos y ñ correctos."

---

## 8. Gestión de usuarios (5 min) — rol Maestro

1. Click en **Usuarios**.
2. Muestra los 5 usuarios precargados.
3. Click **+ Nuevo usuario** → llena `demo_user` / nombre / rol Recepción / contraseña → Crear.
4. 🎯 Muestra el modal verde con las credenciales: "Anótenlas y entréguenselas al empleado. Después él puede cambiarse la contraseña, o ustedes le hacen Reset desde aquí."
5. Demuestra **Reset pw** sobre el usuario nuevo.
6. Demuestra **Editar** → cambia el nombre.
7. Demuestra **Desactivar** → "Cuando un empleado deja el club, lo desactivan. No lo borren — pierden el histórico de quién registró qué."
8. Elimina el `demo_user` al final.

🎯 "Solo el Maestro gestiona usuarios. Es la cuenta más sensible."

---

## 9. Rol Admin — diferencias (5 min)

> Cambia a la **Ventana 2** y entra como `admin` / `AdminPP2026`.

Recorre rápido:
- Nav: Transacciones, Inventario, Ubicaciones. **No** ve Dashboard, Tarifas, Categorías, Usuarios.
- Inventario: puede crear y editar productos, **pero NO ve "Costo unitario" ni "Precios por tarifa"**. 🎯 "Esto es a propósito: el Admin gestiona la operación, pero las finanzas quedan en manos del Maestro."
- En la ficha de producto: **no ve el botón Eliminar**.
- En transacciones: puede registrar los 3 tipos, editar y eliminar todo **excepto las transacciones que creó un Maestro**.

🎯 "El Admin es el rol del encargado operativo: hace todo el día a día menos tocar precios o usuarios."

---

## 10. Rol Recepción — demo de caja (7 min)

> Cambia a la **Ventana 3** y entra como `recepcion1` / `RecepcionPP1`.

1. Nav: solo **Transacciones**. Forzar otras URLs en la barra → redirige. 🎯 "Pantalla mínima, sin distracciones."
2. Click **+ Nueva transacción**: aparecen **Venta** y **Traslado** (no Compra).
3. Demuestra registrar una venta como lo haría el cajero:
    - Buscar producto → agregar → elegir tarifa del dropdown → cantidad → otra línea → Registrar.
    - "Esto es lo que el cajero hace cada vez que un cliente pide algo."
4. Muestra cómo bajo "Registró" aparece `recepcion1`.
5. Demuestra editar **su propia venta del día** → permite.
6. 🎯 "Si intenta editar una venta de **ayer** o de **otro cajero**, no puede. Esto evita errores y mantiene el histórico ordenado."

---

## 11. Limitaciones y soporte (5 min)

Antes de las preguntas, deja claras las reglas del sistema. Apóyate en la sección "Limitaciones del sistema" del [Manual del Maestro](./manual-maestro.html):

- No se puede **vender o trasladar más de lo que hay** en stock.
- En un **traslado**, origen y destino deben ser distintos.
- **Servicios no manejan stock**: solo venta.
- **No se puede borrar/cambiar la cantidad** de una transacción si dejara el stock negativo (típico: compra antigua ya vendida). **Pero sí se puede editar precio/costo/notas.**
- Solo el **Maestro** edita costos y precios.
- **Recepción** solo edita sus ventas del día.
- **Admin** edita todo menos lo que registró un Maestro.

🎯 "Estas no son fallas — son protecciones. Cuando vean un aviso bloqueando algo, no es un error: es el sistema cuidando que el inventario no quede en un estado imposible."

### Soporte
- **Periodo gratuito de corrección de bugs:** 15 días calendario desde hoy.
- **Contacto:** cesarxemiliox@gmail.com / +52 812 346 6691.
- **Manuales:** quedan en `docs/manual-usuario.html` y `docs/manual-maestro.html`, incluidos en el entregable.
- **Respaldos:** Supabase hace backups diarios automáticos.

---

## 12. Q&A (lo que sobre del tiempo)

Preguntas frecuentes que probablemente surjan:

| Pregunta | Respuesta |
|---|---|
| "¿Y si nos quedamos sin internet?" | El sistema requiere internet (es web). Si se cae, registran las ventas en papel y al volver suben todo por CSV. |
| "¿Funciona en celular?" | Sí. Tiene menú hamburguesa en pantallas pequeñas. La pantalla óptima es desktop/tablet. |
| "¿Cuántos usuarios pueden estar conectados a la vez?" | Sin límite práctico para este volumen. |
| "¿Cómo cambio mi contraseña?" | Hoy solo el Maestro las cambia desde Usuarios → Editar. (Si quieren auto-servicio, es una mejora futura). |
| "¿Cuándo cambiar el precio Detal de un producto?" | Cuando suba el costo o decidan ajustar. Las ventas viejas mantienen el precio que tenían. |
| "¿Cuánto tiempo de histórico podemos cargar?" | El histórico de Alegra ya está migrado (sep 2025 – abr 2026). Para más adelante, se acumula automáticamente cada vez que registren una venta. |
| "¿Cómo hago un cierre de mes?" | Sigue la sección **9. Mantenimiento mensual** del Manual del Maestro: conteo físico, ajustes, revisar Dashboard. |
| "¿Cuál es el límite de productos?" | Por practicidad, hasta unos miles (hoy tienen 145). No hay límite duro. |

---

## Anexo A: Checklist de cierre

Antes de terminar la sesión:
- [ ] Le entregaste las **cuentas iniciales** al Maestro principal (en papel o por correo).
- [ ] Le explicaste que **debe cambiar las contraseñas predeterminadas** en su primera sesión real (Manual Maestro, sección 2).
- [ ] Le compartiste los **3 PDF entregables** (cotización, manual usuario, manual maestro) y los **HTML** de manuales.
- [ ] Le mostraste **dónde están los manuales** dentro del repo / entregable.
- [ ] Le dejaste claro el **canal de soporte** (correo + WhatsApp) y el **periodo gratuito** de 15 días.

## Anexo B: Comandos rápidos para ti durante la sesión

- **Si te pierdes en el flujo:** vuelve a `/` (home) → ahí ven las tarjetas de cada módulo.
- **Si necesitas dejar la pantalla limpia entre demos:** abre una pestaña nueva con la URL y empieza fresco.
- **Si registran datos de demo que después estorban:** los borran al final, o le anticipas al cliente que harás "limpieza" después con `reset-operacion.sql`.
- **Si una sección demora:** las secciones 6 (Dashboard) y 4 (CSV) son las que más valor dan al cliente. Las 2 (configuración) y 8 (usuarios) son las que más fácil acortas si vas justo de tiempo.
