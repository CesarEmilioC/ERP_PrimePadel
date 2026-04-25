# Testing — ERP Prime Padel

Plan de testing manual para la versión completa. Marca cada caso `- [x]` cuando funcione, deja un comentario debajo si algo falla y avisamos para arreglar.

**URL:** https://erp-prime-padel.vercel.app/

**Cuentas:**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `CesarC` | `CesarPP2026` | Maestro |
| `maestro` | `MaestroPP2026` | Maestro |
| `admin` | `AdminPP2026` | Admin |
| `recepcion1` | `RecepcionPP1` | Recepción |
| `recepcion2` | `RecepcionPP2` | Recepción |

> Tip: usa una ventana normal y otra en **incógnito** para tener dos roles abiertos en paralelo y comparar lo que ven.

---

## 1. Login y bloqueo de rutas

### 1.1 Acceso bloqueado sin sesión
- [X] Abre el sitio en incógnito → te lleva a `/login`
- [X] Intenta abrir `/dashboard` directo (sin login) → redirige a `/login?next=/dashboard`
- [X] Intenta abrir `/inventario` → redirige a login
- [X] Intenta abrir `/usuarios` → redirige a login

### 1.2 Login válido
- [X] Login con `CesarC` / `CesarPP2026` → home con saludo "Hola, Cesar" y badge "MAESTRO"
- [X] Logout desde el avatar arriba a la derecha → vuelve a `/login`

### 1.3 Login inválido
- [X] `CesarC` con password incorrecta → "Usuario o contraseña incorrectos"
- [X] Usuario inexistente → mismo mensaje (no debe revelar si existe o no)
- [X] Login con espacios o mayúsculas (`CESARC`, ` cesarc `) → debe funcionar (case-insensitive)

**Notas / observaciones:**
> 

---

## 2. Recepción (login `recepcion1` / `RecepcionPP1`)

### 2.1 Lo que NO debe ver
- [X] Nav arriba: solo aparece "Transacciones"
- [X] Home: solo tarjeta de "Transacciones"
- [X] Forzar `/dashboard` en URL → redirige
- [X] Forzar `/inventario` → redirige
- [X] Forzar `/ubicaciones` → redirige
- [X] Forzar `/categorias` → redirige
- [X] Forzar `/usuarios` → redirige

### 2.2 Lo que SÍ puede hacer
- [X] En `/transacciones`: filtro "Tipo" deshabilitado en "Ventas"
-> Me gustaría que la vista en transacciones tuviese filtros por ventas que incluyan cierta categoría (con opción múltiple) y producto (con opción múltiple)
- [X] Click "+ Nueva transacción" → solo aparece el botón "Venta" (no Compra ni Traslado)
- [X] Buscar un producto → agregarlo → llenar cantidad → el precio se autocompleta con el detal 

-> Para poder hacerlo, tuve que registrar una compra primero ya que no hay stock de nada en este momento. Los cajeros no pueden ver las compras, es correcto?
-> Me gustaría que el campo para colocar las cantidades fuese un poco más grande. Adicionalmente, me gustaría que, para todos los inputs numéricos, se pudiese borrar todos los números para escribir la cantidad que quiero sin problemas. También quiero los separadores de miles aplicados en los inputs.
- [X] Agregar el mismo producto dos veces con ubicaciones distintas funciona (2 líneas separadas)
- [X] Registrar la venta → toast verde "Venta registrada"
- [X] La transacción aparece en la lista con:
    - **Fecha y hora** exactas
    - Columna "Registró" mostrando `recepcion1`
    - Items, total, badge verde "Venta"
- [X] Click "Editar" en su propia venta del día → abre diálogo en modo edición
- [X] Cambia cantidad y guarda → toast "Transacción actualizada"
- [X] Click "Eliminar" → confirma → desaparece, stock se revierte

### 2.3 Restricciones de cajero
- [X] Login como `recepcion2`. NO debe ver botones Editar/Eliminar en transacciones de `recepcion1`
- [X] Carga masiva CSV: prepara CSV con una venta y una compra → al subir, la fila de compra debe aparecer en rojo con error "Tu rol solo permite registrar ventas"
-> Para la plantilla, me gustaría que el sistema recibiese las fechas en formato DD/MM/AAAA o DD-MM-AAAA (y/o con la hora de venta, como lo tienes)
-> Si en la plantilla se suben códigos de productos que no existen en el inventario, el sistema rechaza esas filas correcto?
-> Si en la plantilla se suben ventas que superan el stock actual de un producto en la ubicación correspondiente, marca error en esas filas o cómo funciona?
**Notas / observaciones:**
> 

---

## 3. Admin (login `admin` / `AdminPP2026`)

### 3.1 Lo que NO debe ver
- [X] Nav: aparecen Transacciones, Inventario, Ubicaciones (no Dashboard, Categorías, Usuarios)
- [X] Forzar `/dashboard` → redirige
- [X] Forzar `/usuarios` → redirige
- [X] Forzar `/categorias` → redirige

### 3.2 Transacciones
- [X] Click "+ Nueva transacción" → aparecen los 3 botones (Venta / Compra / Traslado)
- [X] Registrar **compra**: producto + ubicación destino + cantidad + costo unitario → confirma. Header dice "Costo unitario", no "Precio venta"
- [X] Registrar **traslado**: producto + origen + destino diferentes + cantidad → guarda. La fila resultante muestra "origen → destino" en cada item
-> Para qué sirve el campo de costo (ref)?
- [X] Traslado con origen = destino → mensaje rojo, no deja guardar
- [X] Venta de un producto sin stock suficiente → mensaje rojo
- [X] Venta de un producto inventariable + un servicio (clase) en la misma transacción → ambos se registran, el servicio no descuenta stock

### 3.3 Inventario
- [X] En `/inventario` ves la lista completa con todos los filtros
-> Me gustaría que la columna de estado tenga el texto centrado, de tal forma que si "Sin stock" pasó a dos líneas, quede centrado.
- [x] Click "+ Nuevo ítem" → diálogo NO debe mostrar "Costo unitario" ni "Precios por lista". Aparece mensaje "Los costos y precios solo los gestiona el rol Maestro"
- [X] Crear un producto sin precio → se crea OK
- [X] En la ficha de un producto: NO aparece botón "Eliminar"
- [X] Hacer un ajuste de inventario funciona (admin sí puede contar físicamente)

### 3.4 Ubicaciones
- [X] Crear una ubicación nueva → aparece en la lista
-> Para qué es el número de orden en listas?
- [X] Editar una ubicación existente
- [X] Borrar una ubicación sin movimientos → se borra. Si tiene movimientos → se marca como inactiva

### 3.5 Permisos de borrado
- [X] Una transacción que registró `recepcion1` ayer (o que registraste tú ayer) → NO debe permitirte editarla ni eliminarla
-> Parece que solo me permitiera editar las transacciones que yo hizo hoy. Considero que el admin debería poder editar todas las transacciones diferentes a las realizadas por la cuenta maestro.
-> Navegar entre pestañas a veces se demora mucho, cómo podríamos mejorar esta parte.
- [X] Una transacción que registraste tú HOY → SÍ puedes editar y eliminar

**Notas / observaciones:**
> 

---

## 4. Maestro (login `CesarC` o `maestro`)

### 4.1 Acceso completo
- [X] Nav: aparecen los 6 links (Transacciones, Inventario, Ubicaciones, Dashboard, Categorías, Usuarios)
- [X] Inventario → diálogo de producto SÍ muestra "Costo unitario" y la sección de "Precios por lista"
-> Cuál es la sección de precios por lista?
- [X] La ficha de un producto SÍ tiene botón "Eliminar"
- [X] Puede editar/eliminar transacciones de cualquier usuario y cualquier día

### 4.2 Dashboard — Pestaña "Ventas y consumo"
- [X] Aparecen KPIs arriba (productos activos, ubicaciones, stock total, valor inventario, alertas, variación %)
-> Cómo calculas la variación con el mes anterior?
- [X] Pestaña "Ventas y consumo" activa por defecto
- [X] Gráfica "Consumo por mes" con paginación (← Ant / Sig →)
- [X] Gráfica "Top productos" con paginación y selector "Por monto / Por cantidad"
- [X] Cambiar a "Por cantidad" reordena de mayor a menor por unidades
- [X] Cambiar a "Por monto" reordena por valor
- [X] Gráfica "Consumo por categoría" (torta) con selector monto/cantidad
- [X] Botón "Ver leyenda (N)" cuando hay más de 3 categorías → abre modal con la lista
- [X] Click fuera del modal lo cierra
- [X] Filtro "Categoría" arriba afecta a todas las gráficas en vivo
- [X] Tooltips de las gráficas: contraste correcto (no negro sobre negro)
- [X] Sección "Ventas por día de la semana" muestra mensaje si aún no hay transacciones reales
-> Me gustaría tener un filtro de fecha inicial y fecha final (inclusive), de tal forma que solo me muestre las ventas y consumo de ese rango
-> La gráifca de top 5 productos por día de la semana, no entiendo cómo funciona? Podría ser una gráfica de barras acumuladas donde cada barra se forme de las cantidades vendidas de los top 5 productos?
-> Me gustaría tener una tabla con paginación de las cantidades vendidas de TODOS lo s productos.
-> Piensa qué otras gráficas le podrían interesar a mi cliente, ellos quieren tener la posibilidad de predecir bien qué hace falta comprar en todo momento, qué días se vende más un producto, etc.
### 4.3 Dashboard — Pestaña "Inventario"
- [X] Click en pestaña "Inventario" → cambia el contenido sin recargar
- [X] "Stock por ubicación" muestra mensaje si stock es 0 (porque el inicial físico aún no llegó)
- [X] "Productos por categoría" muestra gráfica horizontal con N SKUs por categoría (paginada de 5 en 5)
->  No entiendo qué es lo de costo que aparece en las tarjetas de cada ubicación. En este momento hay ubicaciones que sí tienen stock por las pruebas que he hecho, me salen las cantidades en uds, pero me aparece 0 en costo.
-> Me gustaría tener un filtro por categoría o poder buscar por producto (ambos filtros con selección múltiple)
### 4.4 Dashboard — Pestaña "Alertas"
- [X] Click en pestaña "Alertas (N)"
- [ ] Tabla con productos en stock bajo o sin stock
-> Alertas me sale con (93), pero cuando entro e sale "Sin alertas de stock", ssabiendo que la mayoría de productos están sin stock. A pesar de que no se haya configurado un stock mínimo a los productos que migramos, si NO hay stock de alguno, es necesario que salga la alerta.
- [ ] Cada fila muestra código + nombre + categoría + estado (badge rojo o amarillo) + stock total + mínimo
- [ ] Columna "Ubicaciones" muestra chips por ubicación. Rojo si 0 unidades, amarillo si ≤ 2, gris en otro caso
- [ ] Click en el nombre de un producto → te lleva a su ficha

### 4.5 Usuarios
- [X] En `/usuarios` ves los 5 usuarios. Tu fila marcada con "(tú)"
- [X] No puedes desactivarte a ti mismo (botón no aparece)
- [X] No puedes cambiarte el rol (selector deshabilitado en tu fila)
- [X] Crear `testuser` con rol Recepción y contraseña a tu elección → modal verde con credenciales
- [X] Click "Editar" en `testuser` → cambias nombre → guardas → ok
- [X] Click "Editar" → escribes nueva contraseña → guardas → toast "Nueva contraseña activa"
- [X] Click "Reset pw" → modal con contraseña aleatoria nueva
- [X] Click "Desactivar" → confirmas → estado cambia a "Desactivado"
- [X] Cierras sesión y tratas de loguearte como `testuser` → mensaje "Tu cuenta está desactivada"
- [X] Vuelves como maestro y reactivas → ahora sí entra
- [X] Cambias el rol del `testuser` desde el dropdown → toast "Rol actualizado"

**Notas / observaciones:**
> 

---

## 5. Carga masiva CSV (login `admin` o `maestro`)

### 5.1 Plantilla
- [X] En `/transacciones/carga-masiva` → click "Descargar plantilla CSV" → se descarga `plantilla-transacciones.csv`
- [X] El archivo se abre limpio en Excel/Numbers
- [X] Trae las columnas correctas + ejemplos comentados con `#`

### 5.2 Subida válida
- [X] Llena la plantilla con 3-4 ventas reales (códigos que existen) y borra las líneas `#`
- [X] Sube el archivo → preview verde, dice "N transacciones por $X COP"
- [X] Click "Confirmar e importar" → toast verde, redirige
- [X] Las transacciones aparecen en `/transacciones` con tu usuario y fecha-hora del momento

### 5.3 Validaciones
- [X] Subir CSV con un código de producto inexistente → fila roja con mensaje específico
- [X] Subir CSV con una ubicación que no existe → fila roja con mensaje
- [X] Subir CSV con cantidad negativa → fila roja
- [X] Subir CSV con `tipo` que no sea venta/compra → fila roja
- [X] Subir CSV con stock insuficiente para una venta → fila roja "stock insuficiente"
- [X] Si hay alguna fila roja, el botón "Confirmar e importar" debe estar deshabilitado

### 5.4 Agrupación por ticket
- [X] CSV con 2 filas con el mismo `ticket` (mismo tipo y misma fecha) → preview dice "2 transacciones" pero al confirmar se crea **1 sola** con 2 ítems
- [X] CSV con 2 filas con tickets distintos → se crean 2 transacciones separadas

### 5.5 Restricción para recepción
- [X] Login como `recepcion1`. Subir CSV con una venta y una compra → la fila de compra cae en rojo "Tu rol solo permite registrar ventas"

**Notas / observaciones:**
> 

---

## 6. Casos límite y reversa de stock

- [X] Eliminar una transacción tipo **compra** que cargó stock → el stock baja en la ubicación destino (verifica en `/inventario/[id]`)
- [X] Eliminar un **traslado** → origen recupera stock, destino lo pierde
- [X] Editar una venta cambiando cantidad de 2 → 5: stock del producto en esa ubicación baja 3 unidades adicionales
-> A veces se demora mucho guardando cambios.
- [X] Editar una venta cambiando el producto: el producto original recupera stock, el nuevo lo pierde
- [X] Editar fallida: cambia una venta a un producto sin stock suficiente → debe aparecer error y la transacción ORIGINAL queda intacta (rollback funciona)
- [X] Hacer un ajuste de inventario manual de un producto → queda registrado en "Historial de ajustes" en la ficha del producto, con motivo y notas
-> En la tablade histórico de ventas de un producto, la cantidad vendida por mes sale bien pero los totales salen en $0.
-> En inventario, estado qué posibilidades tiene de ser? OK, Sin stock y hay una alerta amarilla o algo por el estilo?

**Notas / observaciones:**
> 

---

## 7. UX general

- [X] El logo de Prime Padel se ve grande y nítido en el nav
- [X] El nav permanece sticky al hacer scroll
- [] En móvil/tablet (responsive): si tienes oportunidad, prueba el sitio en pantalla pequeña — al menos las pantallas más usadas (Transacciones y Nueva transacción)
-> En el celular (o pantallas pequeñas) se ve muy raro, como si todo se apeñuzcara en la parte izquiera. Los objetos se quedan hasta la mitad de la pantalla más o menos.
- [X] Toasts de éxito/error aparecen abajo a la derecha y desaparecen solos
- [ ] No hay errores visibles en la consola del navegador (`F12 → Console`)
-> Solo sale un error:
5022fe2f-e8510918e47ab4af.js:1 Uncaught Error: Minified React error # 418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
    at rD (5022fe2f-e8510918e47ab4af.js:1:35061)
    at rO (5022fe2f-e8510918e47ab4af.js:1:36094)
    at 5022fe2f-e8510918e47ab4af.js:1:118082
    at ix (5022fe2f-e8510918e47ab4af.js:1:122954)
    at ik (5022fe2f-e8510918e47ab4af.js:1:114742)
    at 5022fe2f-e8510918e47ab4af.js:1:110729
    at iu (5022fe2f-e8510918e47ab4af.js:1:110830)
    at iX (5022fe2f-e8510918e47ab4af.js:1:132933)
    at MessagePort.w (340-4ca0f1913e0831a1.js:1:96824)
**Notas / observaciones:**
> 

---

## Cómo reportar bugs

Si algo falla, escribe debajo del check con este formato (puedes pegarlo en cualquier sección):

```
🐛 BUG en [pantalla / acción]
- Rol: [recepcion1 / admin / maestro / etc.]
- Pasos:
   1. ...
   2. ...
- Esperado: ...
- Resultado: ...
- Screenshot: (link o descripción)
```

Conforme me reportes voy arreglando en caliente y te aviso para que vuelvas a probar el caso fallido.
