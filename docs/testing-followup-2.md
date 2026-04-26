# Testing — Tercera ronda (regresión + respuestas a tus dudas)

Cambios y aclaraciones tras la segunda ronda de testing. Ya pusheé y Vercel está desplegando.

**URL:** https://erp-prime-padel.vercel.app/

---

## A. Respuestas a las dudas conceptuales

### A.1 ¿Qué pasa con los precios por lista si cambian los profesores?

Actualmente el sistema tiene **estas listas de precios** precargadas en BD:

| Código | Nombre | Para qué |
|--------|--------|----------|
| `DETAL` | Detal (default) | Precio público al cliente final |
| `EQUIPO_PRIME` | Equipo Prime | Precio especial para el equipo del club |
| `KEVIN_GARCIA` | Kevin García | Precio especial para clases con este profesor |
| `BRYAN_PERAFAN` | Bryan Perafán | Precio especial para clases con este profesor |
| `ALTERNO_1` ... `ALTERNO_8` | Alternos 1–8 | Reservados para nuevos canales/profesores |

**Para gestionar las listas en este momento** (ej. agregar a "Pedro López", o quitar a Kevin García) hay dos opciones:

1. **Pedírmelo** y yo agrego/edito/desactivo desde Supabase (sería 1 línea de SQL).
2. **Construir una pantalla `/listas-precios`** (solo Maestro) donde puedas hacerlo tú mismo, con CRUD igual al de Categorías/Ubicaciones. Lo dejo como **mejora opcional** — me dices si lo quieres y lo agrego.

Mi recomendación: por ahora basta con las 8 ALTERNAS reservadas (ya están creadas, solo hay que ponerles nombre real cuando llegue un nuevo profesor), y la UI dedicada se hace solo si el cliente realmente cambia mucho de profesores. Avísame.

---

### A.2 ¿Por qué algunos productos tienen ubicaciones asignadas y otros no?

**Una ubicación aparece en un producto solo si en algún momento se hizo una transacción o un ajuste de inventario en esa ubicación para ese producto.** Es decir:
- Producto recién creado → ninguna ubicación asignada
- Le haces ajuste de inventario "ingreso inicial: 24 unidades en Bodega Principal" → desde ese momento aparece "Bodega Principal" en sus ubicaciones
- Después haces compra "12 unidades a Nevera Barra" → ahora tiene 2 ubicaciones

Esto es por diseño: solo se "reserva un cajón" en `stock_por_ubicacion` cuando hace falta. Los productos migrados de Alegra que sí tienen ubicaciones asignadas las consiguieron por las transacciones de prueba que hiciste durante el testing.

Cuando llegue el inventario inicial físico del cliente, vas a hacer el ajuste de "ingreso inicial" para cada producto en cada ubicación, y eso poblará automáticamente esa relación.

---

### A.3 ¿Cómo funcionan las alertas si un producto tiene muchas ubicaciones?

**Las alertas se calculan sobre el stock total** (suma de todas las ubicaciones), no por ubicación. Ejemplo:
- Stock mínimo configurado: 10
- Stock en Bodega: 8 / Nevera Barra: 3 / Vitrina: 0
- Total: 11 → estado `OK` (no genera alerta)

Pero los **chips por ubicación** sí muestran el detalle, con código de color:
- 🔴 Rojo si esa ubicación tiene 0
- 🟡 Amarillo si tiene ≤ 2
- ⚪ Gris si tiene más de 2

Así puedes ver "OK en total, pero la Vitrina está vacía → mejor mover stock".

**Sobre apeñuzcamiento**: si un producto tiene 7+ ubicaciones, los chips hacen wrap a varias líneas dentro de la celda con `flex flex-wrap`. No se desbordan. Si en producción ves que se ven mal con muchas ubicaciones, dime y los pongo en una segunda fila o con un "+N más" colapsable.

---

### A.4 ¿Cómo se calcula el costo en una ubicación?

**Costo de una ubicación = SUM(cantidad × costo_unitario) de todos los productos que están en esa ubicación.**

Ejemplo:
- Bodega Principal tiene: 24 cervezas (costo $5.500 c/u) + 50 aguas (costo $1.200 c/u)
- Costo total = (24 × 5.500) + (50 × 1.200) = 132.000 + 60.000 = **$192.000**

Esto se muestra en la pestaña Inventario del Dashboard, en cada tarjeta de ubicación.

Si dice "costo no configurado", significa que **hay stock en esa ubicación pero los productos no tienen `costo_unitario` cargado** (sale $0 multiplicar). Cuando el Maestro vaya configurando el costo de cada producto desde su ficha, las tarjetas se actualizan.

---

### A.5 ¿Qué pasa si cambio el costo o el precio de un producto?

Depende de qué dato:

**Transacciones registradas** (ventas/compras hechas desde el sistema):
- Cada transacción guarda **el precio_unitario al momento de registrarla** en `transaccion_items.precio_unitario`. Es histórico fijo.
- Cambiar el precio del producto **NO afecta** las transacciones viejas. La historia queda intacta.

**Histórico mensual de Alegra** (lo que migramos del reporte):
- Para los meses en que el reporte sí trajo monto: el total queda como está, es lo real.
- Para los meses en que el reporte solo trajo cantidad (la mayoría) y mostramos un total **estimado** con asterisco: ese total se calcula con el **precio detal ACTUAL**. Si cambias el precio, los totales estimados de meses pasados también se mueven.

**Tarjetas del dashboard** (valor inventario, costo por ubicación, días de stock):
- Se calculan con los datos actuales (cantidades actuales × costos actuales). Si cambias el costo, esos números se actualizan.

**Alertas de stock**:
- Solo dependen de cantidad y stock_minimo_alerta, no de costos. No se afectan.

> Resumen: **lo que ya quedó registrado como transacción no se mueve**. Lo que se calcula al vuelo (dashboard, tarjetas, días estimados) sí se actualiza con los nuevos valores.

---

### A.6 ¿Qué pasa si subo un CSV con compra de un servicio?

Ya está manejado. **Ahora el sistema lo rechaza con un mensaje claro** durante el preview:

> *"Clase 1 hora - Pedro" no se inventaría (es servicio o no inventariable); no admite compras*

Esto antes pasaba al server y fallaba allá; ahora se atrapa al validar el CSV y la fila aparece en rojo en el preview, sin dejar importar hasta corregir.

---

## B. Verificación de los cambios nuevos

### B.1 Recepción puede registrar traslados ahora

Login como `recepcion1`:

- [X] En `/transacciones` → "+ Nueva transacción" → aparecen los botones **Venta** y **Traslado** (NO aparece "Compra")
- [X] Selecciona **Traslado**, agrega un producto, elige origen y destino, cantidad → registra. Funciona.
- [X] La transacción aparece en la lista con badge "Traslado" (amarillo)
- [X] El filtro de "Tipo" para recepción ahora ofrece: Todas / Ventas / Traslados (NO compras)
- [X] Recepción puede editar/eliminar **sus propias** ventas o traslados del día (igual que antes con ventas)
- [X] Carga masiva CSV: si subes una venta + un traslado + una compra → solo la compra cae en rojo con mensaje "Tu rol no permite registrar compras"

### B.2 Hydration error #418

- [X] Abre `/transacciones`, presiona `F12 → Console`
- [X] **NO debe salir** el error `Minified React error #418`
- [ ] Si sigue saliendo, copia el stacktrace completo aquí:
-> favicon.ico:1  Failed to load resource: the server responded with a status of 404 ()

### B.3 NumericInput bloquea letras

En "+ Nueva transacción" → campo cantidad o precio:

- [X] Intenta escribir letras (ej. `abc`) → **no aparecen** en el input (se bloquean al teclear)
- [X] Intenta pegar `1a2b3c` (Ctrl+V) → solo se pegan los dígitos: `123`
- [X] Las teclas Backspace, Delete, flechas, Tab siguen funcionando
- [X] Lo mismo en formulario de producto (stock mínimo, costo, precios) y en ajuste de inventario

### B.4 Paginación 10 por página

- [X] **`/inventario`**: ahora muestra 10 ítems por página, con paginador arriba ("X–Y de Z ítems") y abajo
- [X] Cambiar un filtro reinicia a la página 1
- [X] **`/transacciones`**: 10 transacciones por página, paginador arriba y abajo
- [X] **Dashboard → Top productos / Cantidades / SKUs**: 10 por página (antes era 5)
-> Por qué la página de inventarios no tiene botón de limpiar filtros Todas las páginas con filtro deben tenerlo.

### B.5 Colores de gráfica apilada

- [X] Dashboard → pestaña Ventas → "Top 5 productos por día de la semana"
- [X] Los 5 colores de la gráfica son distinguibles entre sí (naranja, amarillo, verde menta, azul, lila)

### B.6 CSV con mejores mensajes

- [X] Subir un CSV con código inválido → mensaje: *No se encontró producto con código "XYZ"* (correcto, usa código)
- [X] Subir un CSV con stock insuficiente → mensaje: *Stock insuficiente: "Cerveza Aguila 330ml" tiene 5 en Barra Cajero, se intenta vender 10* (usa nombre del producto)
- [X] Subir un CSV con compra de un servicio → mensaje: *"Clase 1 hora" no se inventaría (es servicio o no inventariable); no admite compras*

### B.7 Logo móvil más grande

- [X] Abrir en celular o redimensionar a 400px de ancho
- [X] Logo se ve más grande que antes (h-14 = 56px, antes era 40px)
- [X] El nav ocupa el ancho completo debajo del logo en móvil
- [X] Los links del nav siguen siendo accesibles, no se cortan
-> QUiero que el logo de PP sea más grande y el nav tenga un hamburger menu si tiene más de 2 pestañas para el menú.
---

## C. Pendientes / decisiones para próximas rondas

Marca lo que quieras y procedemos:

- [X] Construir UI `/listas-precios` para gestionar profesores y canales (Maestro)
- [X] Si los chips de ubicaciones en alertas se ven apeñuzcados con muchas, agregar "+N más" colapsable
- [ ] Cambiar el cálculo de "Variación mes anterior" a comparar contra mes calendario actual (cuando haya transacciones reales del mes en curso)
- [ ] Otros bugs o mejoras que vayas notando

---

## Cómo reportar bugs nuevos

```
🐛 BUG en [pantalla / acción]
- Rol: [recepcion1 / admin / maestro / etc.]
- Pasos:
   1. ...
   2. ...
- Esperado: ...
- Resultado: ...
```

Cuando termines la verificación y todo esté ✅:
1. Actualizamos el manual de usuario completo
2. Creamos la extensión del manual para el rol Maestro
3. Marcamos cotización como entregada

-> A veces sigue demorándose bastante en navegar entre páginas, doy click sobre los botones y parece que nada estuviese cargando y ya luego de unos 5 segundos me redirige.
