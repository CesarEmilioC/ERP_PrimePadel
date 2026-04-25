# Testing — Segunda ronda (regresión + verificación)

Solo lo que cambió o se aclaró tras la primera ronda. Cuando todo esté ✅, pasamos a actualizar el manual de usuario y la extensión para el rol Maestro.

**URL:** https://erp-prime-padel.vercel.app/

> Recuerda usar incógnito o limpiar cookies si ves el cartel "redirected too many times" — eso ya lo arreglé pero podría haber sesiones viejas.

---

## A. Respuestas a tus preguntas (no son tests, solo aclaraciones)

### ¿Los cajeros pueden ver las compras?
**No.** Recepción solo ve transacciones tipo `venta` en la lista — las compras y traslados están escondidos a propósito porque son operaciones de control de inventario que no le tocan al cajero. Eso es lo que se acordó en la matriz de roles. Para que el recepcionista pueda hacer una venta de un producto que llegó nuevo, primero un Admin o Maestro tiene que registrar la compra.

### ¿Para qué sirve "Costo unit. (ref.)" en traslados?
Es solo informativo: indica el costo del item que se está moviendo (para que quede registrado el valor del inventario que cambió de bodega). **No afecta dashboard de ventas ni de compras** — los traslados no son ingresos ni egresos, solo movimientos internos de stock entre ubicaciones del club. Si quieres lo puedo ocultar para no confundir.

### ¿Para qué es el "Orden en listas" en ubicaciones / categorías?
Es el orden en que aparecen en los **dropdowns** del sistema (ej. en el form de Nueva transacción cuando seleccionas la ubicación de origen). Si quieres que "Barra Cajero" aparezca antes que "Bodega Principal" cuando recepción esté vendiendo, le pones orden=1 a Barra Cajero y orden=10 a Bodega. Un valor más bajo aparece primero. Es solo UX, no afecta nada más.

### ¿Cuál es la sección "Precios por lista"?
Está en el formulario de **crear/editar producto** (cuando entras como Maestro), al final del diálogo. Permite asignarle a un mismo producto **varios precios distintos según el canal**: precio Detal (público general), precio Equipo Prime, precios especiales para profesores externos (Kevin García, Bryan Perafán), Pro Team, etc. Por ahora todos los productos solo tienen Detal cargado; las otras listas están vacías. Solo el Maestro ve esta sección porque toca finanzas.

### ¿Cómo se calcula la variación con el mes anterior?
Es: **((monto_mes_actual − monto_mes_anterior) / monto_mes_anterior) × 100**. Por ejemplo, si en marzo se vendieron $1.000.000 y en abril $1.100.000, la variación es +10%. Si abril es el mes más reciente y no hay datos de marzo, sale 0%. Como el histórico es mensual de Alegra, el "mes actual" es el último mes con datos del histórico, no el mes calendario actual. Cuando empiecen a registrarse transacciones reales del mes en curso podemos cambiar a comparar contra el mes de calendario actual.

### Estados posibles en la columna "Estado" del inventario
- 🟢 **OK**: tiene stock por encima del mínimo configurado.
- 🟡 **Bajo**: el stock total está en o por debajo del mínimo configurado.
- 🔴 **Sin stock**: el stock total es 0.
- ⚪ **Inactivo**: el producto fue desactivado (ej. clases con profesor que ya no trabaja).
- ⚪ **— (raya)**: el producto NO se inventaría (servicios o productos no inventariables).

---

## B. Bugs corregidos — verificar regresión

### B.1 Alertas detalladas (login `CesarC` o `maestro`)
- [ ] `/dashboard` → pestaña **Alertas (N)**
- [ ] La pestaña dice un número (ej. "Alertas (93)"). Al entrar **debe mostrar la tabla con los productos**, no "Sin alertas"
- [ ] Cada fila muestra producto + categoría + estado (🔴 Sin stock o 🟡 Bajo) + cantidad total + mínimo + chips por ubicación
- [ ] Los chips son rojos si la ubicación tiene 0, amarillos si ≤ 2, grises en otros casos
- [ ] Click en el nombre del producto → te lleva a la ficha del producto

### B.2 Histórico de ventas en la ficha del producto
- [ ] Entra a `/inventario/[id]` de cualquier producto migrado de Alegra
- [ ] La sección "Histórico de ventas (mensual)" muestra **totales en pesos**, no $0
- [ ] Los totales que son **estimados** (porque el reporte original solo traía cantidad) tienen un asterisco `*` con una nota arriba que lo explica

### B.3 Hydration error en consola
- [ ] Abre `/transacciones` o cualquier página
- [ ] **F12 → Console**: no debe aparecer el error `Minified React error #418`

### B.4 Valor en costo en pestaña Inventario del Dashboard
- [ ] `/dashboard` → pestaña **Inventario**
- [ ] Las tarjetas de cada ubicación con stock muestran **"costo no configurado"** en lugar de "$0,00 en costo" cuando hay stock pero los productos no tienen costo unitario cargado. (Cuando llegues a configurar el costo unitario de los productos, el valor real aparecerá ahí)

---

## C. Permisos del Admin (login `admin` / `AdminPP2026`)

- [ ] Como admin, en la lista de transacciones, los botones **Editar** y **Eliminar** aparecen también en transacciones registradas por **otros admins o por recepción**, sin importar la fecha
- [ ] **NO aparecen** los botones cuando la transacción fue registrada por un **Maestro** (CesarC o maestro)
- [ ] Si admin intenta editar una transacción del maestro forzando la URL → debe salir error en el server action: "Solo el rol Maestro puede modificar transacciones creadas por otro Maestro"
- [ ] Recepción: sin cambios, sigue solo viendo ventas y solo puede editar las suyas del día

---

## D. Filtros

### D.1 En lista de transacciones
- [ ] `/transacciones` ahora tiene 5 filtros: Tipo, Desde, Hasta, **Categoría (multi)**, **Producto (multi)**
- [ ] Filtrar por una categoría → la lista se reduce a transacciones que tengan al menos un ítem de esa categoría
- [ ] Filtrar por un producto específico → idem
- [ ] Combinar fecha + categoría → ambos filtros se aplican
- [ ] Botón "Limpiar filtros" resetea todos
- [ ] Funciona con cualquier rol (recepción solo ve ventas, los filtros aplican igual)

### D.2 En Dashboard pestaña Ventas
- [ ] `/dashboard` pestaña Ventas muestra ahora 4 filtros: **Categoría**, **Mes desde**, **Mes hasta**, botón Limpiar
- [ ] Aplicar "Mes desde = 2026-01" y "Mes hasta = 2026-04" → todas las gráficas (Consumo por mes, Top productos, Por categoría, tabla cantidades, días de stock) se filtran al rango
- [ ] El filtro de Categoría sigue funcionando como antes
- [ ] Limpiar filtros restaura todo el histórico

---

## E. Inputs numéricos (NumericInput)

Probar en `/transacciones` → "+ Nueva transacción":
- [ ] El campo **Cantidad** es más ancho que antes
- [ ] Se puede borrar todo el contenido (Backspace) y escribir libremente
- [ ] Al escribir un número grande (ej. `12500`) y hacer click fuera, se muestra con separador: `12.500`
- [ ] Al volver a hacer click en el campo, se selecciona todo automáticamente
- [ ] El campo **Precio venta / Costo unitario** se comporta igual

Probar también en formulario de producto (`/inventario` → + Nuevo ítem como Maestro):
- [ ] Stock mínimo, Costo unitario y los Precios por lista se comportan igual

---

## F. Dashboard — gráficas y análisis nuevos

### F.1 Top productos por día de la semana (apilado)
- [ ] `/dashboard` → pestaña Ventas → bajar al final
- [ ] Si hay transacciones reales registradas, aparece una **gráfica de barras apiladas** (no la tabla anterior)
- [ ] Cada barra es un día de la semana, dividida en colores por los 5 productos top
- [ ] Si no hay transacciones aún, no aparece (mensaje en la sección "Ventas por día de la semana")

### F.2 Tabla paginada de cantidades vendidas
- [ ] Bajo el Top productos aparece una sección "Cantidades vendidas por producto"
- [ ] Tabla con #, Producto, Categoría, Cantidad, Monto
- [ ] Paginación de 5 en 5 con botones ← / →
- [ ] Total de productos visible: "(1–5 de N)"

### F.3 Días estimados de stock (predictivo)
- [ ] Si hay stock + histórico de ventas, aparece sección "Días estimados de stock"
- [ ] Muestra: producto, stock actual, promedio venta/día, días restantes, acción sugerida
- [ ] Color de "días restantes": rojo si <7d, amarillo si <14d, verde en otros casos
- [ ] Acción sugerida: "⚠ Comprar ya" / "Programar compra" / "OK"

> Como el inventario inicial físico aún no se cargó, esta sección puede salir vacía. Empezará a tener datos útiles cuando se carguen los conteos físicos del cliente.

---

## G. CSV con fechas en DD/MM/AAAA

- [ ] Descargar la nueva plantilla CSV → los ejemplos vienen en formato `01/05/2026`
- [ ] Llenar un CSV de prueba con fechas en `DD/MM/AAAA` (ej. `25/04/2026`) → al subirlo, las filas son válidas
- [ ] Probar también `DD-MM-AAAA` (ej. `25-04-2026`) → válido
- [ ] Probar también con hora `25/04/2026 14:30` → válido y la transacción guarda esa hora exacta
- [ ] El formato anterior `2026-04-25` sigue funcionando para retrocompatibilidad

---

## H. Otros ajustes UX

### H.1 Inventario — columna Estado centrada
- [ ] `/inventario` con la lista completa
- [ ] La columna "Estado" tiene el badge **centrado horizontalmente** en cada celda

### H.2 Responsive móvil
- [ ] Abrir el sitio en celular o redimensionar el navegador a ancho ~400px
- [ ] El logo del nav se reduce a un tamaño que cabe (h-10 en móvil)
- [ ] Los links del nav hacen wrap a una segunda línea si son muchos
- [ ] El header de cada página (h1 + botones) se reorganiza en columna en pantallas chicas
- [ ] Las tablas tienen scroll horizontal cuando no caben

---

## I. Performance (notar y reportar)

- [ ] Navegación entre pestañas del Dashboard (Ventas / Inventario / Alertas): **debe ser instantánea** (es estado de cliente, no requiere request)
- [ ] Navegación entre páginas (Transacciones → Inventario): si tarda, anótalo. Es servidor, depende de la BD. Como ya estamos en Vercel free tier, una primera carga puede demorar 1-2s después de inactividad ("cold start")
- [ ] Editar una transacción: el guardado puede demorar 1-2s mientras hace delete + insert + reversa de stock. Si tarda más de 5s repetidamente, anota cuál transacción

---

## Cómo reportar bugs

```
🐛 BUG en [pantalla / acción]
- Rol: [recepcion1 / admin / maestro / etc.]
- Pasos:
   1. ...
   2. ...
- Esperado: ...
- Resultado: ...
```

Cuando todo esté ✅:
1. Actualizamos el manual de usuario con todas las nuevas funciones
2. Creamos un manual de extensión para el rol Maestro con la administración del sistema
3. Marcamos cotización como entregada
