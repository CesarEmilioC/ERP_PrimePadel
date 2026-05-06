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
-> Qué pasa si llegan a querer cambiar los profesores, o añadir/edtiar/quitar una categoría nueva de precios? Cómo funcionaría esta parte

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
- [X] `/dashboard` → pestaña **Alertas (N)**
- [X] La pestaña dice un número (ej. "Alertas (93)"). Al entrar **debe mostrar la tabla con los productos**, no "Sin alertas"
- [X] Cada fila muestra producto + categoría + estado (🔴 Sin stock o 🟡 Bajo) + cantidad total + mínimo + chips por ubicación
- [X] Los chips son rojos si la ubicación tiene 0, amarillos si ≤ 2, grises en otros casos
- [X] Click en el nombre del producto → te lleva a la ficha del producto
-> Por qué hay productos que sí tienen las ubicaciones asignadas y otros no? Cómo funciona esto?
-> Si un prodcuto tiene muchas ubiaciones asignadas, cómo funionan las alertas? Estas funcionan con respecto al stock total del producto? Se apeñuzcarían las tarjetas en la columnas de ubicaciones?

### B.2 Histórico de ventas en la ficha del producto
- [X] Entra a `/inventario/[id]` de cualquier producto migrado de Alegra
- [X] La sección "Histórico de ventas (mensual)" muestra **totales en pesos**, no $0
- [X] Los totales que son **estimados** (porque el reporte original solo traía cantidad) tienen un asterisco `*` con una nota arriba que lo explica

### B.3 Hydration error en consola
- [ ] Abre `/transacciones` o cualquier página
- [ ] **F12 → Console**: no debe aparecer el error `Minified React error #418`
-> Sigue saliendo, pero es el único error.

### B.4 Valor en costo en pestaña Inventario del Dashboard
- [X] `/dashboard` → pestaña **Inventario**
- [X] Las tarjetas de cada ubicación con stock muestran **"costo no configurado"** en lugar de "$0,00 en costo" cuando hay stock pero los productos no tienen costo unitario cargado. (Cuando llegues a configurar el costo unitario de los productos, el valor real aparecerá ahí)
-> Cómo se calcula el costo en una ubicación? Tiene en cuenta todos los productos que hay en esa ubicación?
-> Qué pasa si en algún momento cambia el costo y/o precio de un item? Cómo se calcularían los visuales del sitio web? Por ejemplo, los registros antiguos me mostrarían otros valores correcto? Ya que usan el detal actual.
---

## C. Permisos del Admin (login `admin` / `AdminPP2026`)

- [X] Como admin, en la lista de transacciones, los botones **Editar** y **Eliminar** aparecen también en transacciones registradas por **otros admins o por recepción**, sin importar la fecha
- [X] **NO aparecen** los botones cuando la transacción fue registrada por un **Maestro** (CesarC o maestro)
- [X] Si admin intenta editar una transacción del maestro forzando la URL → debe salir error en el server action: "Solo el rol Maestro puede modificar transacciones creadas por otro Maestro"
- [X] Recepción: sin cambios, sigue solo viendo ventas y solo puede editar las suyas del día
-> Los de recepción deben poder registrar translados creería yo, por si hay algún evento en el club o algo por el estilo y mueven ciertos productos de un lugar a otro.
---

## D. Filtros

### D.1 En lista de transacciones
- [X] `/transacciones` ahora tiene 5 filtros: Tipo, Desde, Hasta, **Categoría (multi)**, **Producto (multi)**
- [X] Filtrar por una categoría → la lista se reduce a transacciones que tengan al menos un ítem de esa categoría
- [X] Filtrar por un producto específico → idem
- [X] Combinar fecha + categoría → ambos filtros se aplican
- [X] Botón "Limpiar filtros" resetea todos
- [X] Funciona con cualquier rol (recepción solo ve ventas, los filtros aplican igual)

### D.2 En Dashboard pestaña Ventas
- [X] `/dashboard` pestaña Ventas muestra ahora 4 filtros: **Categoría**, **Mes desde**, **Mes hasta**, botón Limpiar
- [X] Aplicar "Mes desde = 2026-01" y "Mes hasta = 2026-04" → todas las gráficas (Consumo por mes, Top productos, Por categoría, tabla cantidades, días de stock) se filtran al rango
- [X] El filtro de Categoría sigue funcionando como antes
- [X] Limpiar filtros restaura todo el histórico

---

## E. Inputs numéricos (NumericInput)

Probar en `/transacciones` → "+ Nueva transacción":
- [X] El campo **Cantidad** es más ancho que antes
- [X] Se puede borrar todo el contenido (Backspace) y escribir libremente
-> Si es un input numérico, que no me permita digitar letras (esto para todos los inputs así en el sistema ERP)
- [X] Al escribir un número grande (ej. `12500`) y hacer click fuera, se muestra con separador: `12.500`
- [X] Al volver a hacer click en el campo, se selecciona todo automáticamente
- [X] El campo **Precio venta / Costo unitario** se comporta igual

Probar también en formulario de producto (`/inventario` → + Nuevo ítem como Maestro):
- [X] Stock mínimo, Costo unitario y los Precios por lista se comportan igual

---

## F. Dashboard — gráficas y análisis nuevos

### F.1 Top productos por día de la semana (apilado)
- [X] `/dashboard` → pestaña Ventas → bajar al final
- [X] Si hay transacciones reales registradas, aparece una **gráfica de barras apiladas** (no la tabla anterior)
- [X] Cada barra es un día de la semana, dividida en colores por los 5 productos top
-> Utiliza colores que contrasten un poco mejor sin perder elegancia, no se nota mucho la diferencia entre los que están.
- [X] Si no hay transacciones aún, no aparece (mensaje en la sección "Ventas por día de la semana")

### F.2 Tabla paginada de cantidades vendidas
- [X] Bajo el Top productos aparece una sección "Cantidades vendidas por producto"
- [X] Tabla con #, Producto, Categoría, Cantidad, Monto
- [X] Paginación de 5 en 5 con botones ← / →
- [X] Total de productos visible: "(1–5 de N)"
-> En las tablas me gustaría mostrar 10 registros por página.

### F.3 Días estimados de stock (predictivo)
- [X] Si hay stock + histórico de ventas, aparece sección "Días estimados de stock"
- [X] Muestra: producto, stock actual, promedio venta/día, días restantes, acción sugerida
- [X] Color de "días restantes": rojo si <7d, amarillo si <14d, verde en otros casos
- [X] Acción sugerida: "⚠ Comprar ya" / "Programar compra" / "OK"

> Como el inventario inicial físico aún no se cargó, esta sección puede salir vacía. Empezará a tener datos útiles cuando se carguen los conteos físicos del cliente.
-> Sí me salió una fila ya que con los tests hicimos varias transacciones de prueba y tenemos stock de prueba en algunos productos

---

## G. CSV con fechas en DD/MM/AAAA

- [X] Descargar la nueva plantilla CSV → los ejemplos vienen en formato `01/05/2026`
- [X] Llenar un CSV de prueba con fechas en `DD/MM/AAAA` (ej. `25/04/2026`) → al subirlo, las filas son válidas
- [X] Probar también `DD-MM-AAAA` (ej. `25-04-2026`) → válido
- [X] Probar también con hora `25/04/2026 14:30` → válido y la transacción guarda esa hora exacta
- [X] El formato anterior `2026-04-25` sigue funcionando para retrocompatibilidad
-> Qué pasa si subo un CSV con compra de un item que es de tipo servicio?
-> En los mensajes de error y demás que mencionan un producto, podrías mencionar su nombre en vez delcódigo? A no ser que necesites mencionarlo, eje: no existe producto con código "XYZ"
---

## H. Otros ajustes UX

### H.1 Inventario — columna Estado centrada
- [X] `/inventario` con la lista completa
-> Añade paginación a esta lista. Todas las tablas deben tener paginación, con 10 registros por página.
- [X] La columna "Estado" tiene el badge **centrado horizontalmente** en cada celda

### H.2 Responsive móvil
- [X] Abrir el sitio en celular o redimensionar el navegador a ancho ~400px
- [X] El logo del nav se reduce a un tamaño que cabe (h-10 en móvil)
-> Hazlo un poco más grande y acomoda mejor los elementos del nav en el móvil
- [X] Los links del nav hacen wrap a una segunda línea si son muchos
- [X] El header de cada página (h1 + botones) se reorganiza en columna en pantallas chicas
- [X] Las tablas tienen scroll horizontal cuando no caben

---

## I. Performance (notar y reportar)

- [X] Navegación entre pestañas del Dashboard (Ventas / Inventario / Alertas): **debe ser instantánea** (es estado de cliente, no requiere request)
- [X] Navegación entre páginas (Transacciones → Inventario): si tarda, anótalo. Es servidor, depende de la BD. Como ya estamos en Vercel free tier, una primera carga puede demorar 1-2s después de inactividad ("cold start")
- [X] Editar una transacción: el guardado puede demorar 1-2s mientras hace delete + insert + reversa de stock. Si tarda más de 5s repetidamente, anota cuál transacción

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
