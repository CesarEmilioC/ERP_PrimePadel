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
- [ ] Abre el sitio en incógnito → te lleva a `/login`
- [ ] Intenta abrir `/dashboard` directo (sin login) → redirige a `/login?next=/dashboard`
- [ ] Intenta abrir `/inventario` → redirige a login
- [ ] Intenta abrir `/usuarios` → redirige a login

### 1.2 Login válido
- [ ] Login con `CesarC` / `CesarPP2026` → home con saludo "Hola, Cesar" y badge "MAESTRO"
- [ ] Logout desde el avatar arriba a la derecha → vuelve a `/login`

### 1.3 Login inválido
- [ ] `CesarC` con password incorrecta → "Usuario o contraseña incorrectos"
- [ ] Usuario inexistente → mismo mensaje (no debe revelar si existe o no)
- [ ] Login con espacios o mayúsculas (`CESARC`, ` cesarc `) → debe funcionar (case-insensitive)

**Notas / observaciones:**
> 

---

## 2. Recepción (login `recepcion1` / `RecepcionPP1`)

### 2.1 Lo que NO debe ver
- [ ] Nav arriba: solo aparece "Transacciones"
- [ ] Home: solo tarjeta de "Transacciones"
- [ ] Forzar `/dashboard` en URL → redirige
- [ ] Forzar `/inventario` → redirige
- [ ] Forzar `/ubicaciones` → redirige
- [ ] Forzar `/categorias` → redirige
- [ ] Forzar `/usuarios` → redirige

### 2.2 Lo que SÍ puede hacer
- [ ] En `/transacciones`: filtro "Tipo" deshabilitado en "Ventas"
- [ ] Click "+ Nueva transacción" → solo aparece el botón "Venta" (no Compra ni Traslado)
- [ ] Buscar un producto → agregarlo → llenar cantidad → el precio se autocompleta con el detal
- [ ] Agregar el mismo producto dos veces con ubicaciones distintas funciona (2 líneas separadas)
- [ ] Registrar la venta → toast verde "Venta registrada"
- [ ] La transacción aparece en la lista con:
    - **Fecha y hora** exactas
    - Columna "Registró" mostrando `recepcion1`
    - Items, total, badge verde "Venta"
- [ ] Click "Editar" en su propia venta del día → abre diálogo en modo edición
- [ ] Cambia cantidad y guarda → toast "Transacción actualizada"
- [ ] Click "Eliminar" → confirma → desaparece, stock se revierte

### 2.3 Restricciones de cajero
- [ ] Login como `recepcion2`. NO debe ver botones Editar/Eliminar en transacciones de `recepcion1`
- [ ] Carga masiva CSV: prepara CSV con una venta y una compra → al subir, la fila de compra debe aparecer en rojo con error "Tu rol solo permite registrar ventas"

**Notas / observaciones:**
> 

---

## 3. Admin (login `admin` / `AdminPP2026`)

### 3.1 Lo que NO debe ver
- [ ] Nav: aparecen Transacciones, Inventario, Ubicaciones (no Dashboard, Categorías, Usuarios)
- [ ] Forzar `/dashboard` → redirige
- [ ] Forzar `/usuarios` → redirige
- [ ] Forzar `/categorias` → redirige

### 3.2 Transacciones
- [ ] Click "+ Nueva transacción" → aparecen los 3 botones (Venta / Compra / Traslado)
- [ ] Registrar **compra**: producto + ubicación destino + cantidad + costo unitario → confirma. Header dice "Costo unitario", no "Precio venta"
- [ ] Registrar **traslado**: producto + origen + destino diferentes + cantidad → guarda. La fila resultante muestra "origen → destino" en cada item
- [ ] Traslado con origen = destino → mensaje rojo, no deja guardar
- [ ] Venta de un producto sin stock suficiente → mensaje rojo
- [ ] Venta de un producto inventariable + un servicio (clase) en la misma transacción → ambos se registran, el servicio no descuenta stock

### 3.3 Inventario
- [ ] En `/inventario` ves la lista completa con todos los filtros
- [ ] Click "+ Nuevo ítem" → diálogo NO debe mostrar "Costo unitario" ni "Precios por lista". Aparece mensaje "Los costos y precios solo los gestiona el rol Maestro"
- [ ] Crear un producto sin precio → se crea OK
- [ ] En la ficha de un producto: NO aparece botón "Eliminar"
- [ ] Hacer un ajuste de inventario funciona (admin sí puede contar físicamente)

### 3.4 Ubicaciones
- [ ] Crear una ubicación nueva → aparece en la lista
- [ ] Editar una ubicación existente
- [ ] Borrar una ubicación sin movimientos → se borra. Si tiene movimientos → se marca como inactiva

### 3.5 Permisos de borrado
- [ ] Una transacción que registró `recepcion1` ayer (o que registraste tú ayer) → NO debe permitirte editarla ni eliminarla
- [ ] Una transacción que registraste tú HOY → SÍ puedes editar y eliminar

**Notas / observaciones:**
> 

---

## 4. Maestro (login `CesarC` o `maestro`)

### 4.1 Acceso completo
- [ ] Nav: aparecen los 6 links (Transacciones, Inventario, Ubicaciones, Dashboard, Categorías, Usuarios)
- [ ] Inventario → diálogo de producto SÍ muestra "Costo unitario" y la sección de "Precios por lista"
- [ ] La ficha de un producto SÍ tiene botón "Eliminar"
- [ ] Puede editar/eliminar transacciones de cualquier usuario y cualquier día

### 4.2 Dashboard — Pestaña "Ventas y consumo"
- [ ] Aparecen KPIs arriba (productos activos, ubicaciones, stock total, valor inventario, alertas, variación %)
- [ ] Pestaña "Ventas y consumo" activa por defecto
- [ ] Gráfica "Consumo por mes" con paginación (← Ant / Sig →)
- [ ] Gráfica "Top productos" con paginación y selector "Por monto / Por cantidad"
- [ ] Cambiar a "Por cantidad" reordena de mayor a menor por unidades
- [ ] Cambiar a "Por monto" reordena por valor
- [ ] Gráfica "Consumo por categoría" (torta) con selector monto/cantidad
- [ ] Botón "Ver leyenda (N)" cuando hay más de 3 categorías → abre modal con la lista
- [ ] Click fuera del modal lo cierra
- [ ] Filtro "Categoría" arriba afecta a todas las gráficas en vivo
- [ ] Tooltips de las gráficas: contraste correcto (no negro sobre negro)
- [ ] Sección "Ventas por día de la semana" muestra mensaje si aún no hay transacciones reales

### 4.3 Dashboard — Pestaña "Inventario"
- [ ] Click en pestaña "Inventario" → cambia el contenido sin recargar
- [ ] "Stock por ubicación" muestra mensaje si stock es 0 (porque el inicial físico aún no llegó)
- [ ] "Productos por categoría" muestra gráfica horizontal con N SKUs por categoría (paginada de 5 en 5)

### 4.4 Dashboard — Pestaña "Alertas"
- [ ] Click en pestaña "Alertas (N)"
- [ ] Tabla con productos en stock bajo o sin stock
- [ ] Cada fila muestra código + nombre + categoría + estado (badge rojo o amarillo) + stock total + mínimo
- [ ] Columna "Ubicaciones" muestra chips por ubicación. Rojo si 0 unidades, amarillo si ≤ 2, gris en otro caso
- [ ] Click en el nombre de un producto → te lleva a su ficha

### 4.5 Usuarios
- [ ] En `/usuarios` ves los 5 usuarios. Tu fila marcada con "(tú)"
- [ ] No puedes desactivarte a ti mismo (botón no aparece)
- [ ] No puedes cambiarte el rol (selector deshabilitado en tu fila)
- [ ] Crear `testuser` con rol Recepción y contraseña a tu elección → modal verde con credenciales
- [ ] Click "Editar" en `testuser` → cambias nombre → guardas → ok
- [ ] Click "Editar" → escribes nueva contraseña → guardas → toast "Nueva contraseña activa"
- [ ] Click "Reset pw" → modal con contraseña aleatoria nueva
- [ ] Click "Desactivar" → confirmas → estado cambia a "Desactivado"
- [ ] Cierras sesión y tratas de loguearte como `testuser` → mensaje "Tu cuenta está desactivada"
- [ ] Vuelves como maestro y reactivas → ahora sí entra
- [ ] Cambias el rol del `testuser` desde el dropdown → toast "Rol actualizado"

**Notas / observaciones:**
> 

---

## 5. Carga masiva CSV (login `admin` o `maestro`)

### 5.1 Plantilla
- [ ] En `/transacciones/carga-masiva` → click "Descargar plantilla CSV" → se descarga `plantilla-transacciones.csv`
- [ ] El archivo se abre limpio en Excel/Numbers
- [ ] Trae las columnas correctas + ejemplos comentados con `#`

### 5.2 Subida válida
- [ ] Llena la plantilla con 3-4 ventas reales (códigos que existen) y borra las líneas `#`
- [ ] Sube el archivo → preview verde, dice "N transacciones por $X COP"
- [ ] Click "Confirmar e importar" → toast verde, redirige
- [ ] Las transacciones aparecen en `/transacciones` con tu usuario y fecha-hora del momento

### 5.3 Validaciones
- [ ] Subir CSV con un código de producto inexistente → fila roja con mensaje específico
- [ ] Subir CSV con una ubicación que no existe → fila roja con mensaje
- [ ] Subir CSV con cantidad negativa → fila roja
- [ ] Subir CSV con `tipo` que no sea venta/compra → fila roja
- [ ] Subir CSV con stock insuficiente para una venta → fila roja "stock insuficiente"
- [ ] Si hay alguna fila roja, el botón "Confirmar e importar" debe estar deshabilitado

### 5.4 Agrupación por ticket
- [ ] CSV con 2 filas con el mismo `ticket` (mismo tipo y misma fecha) → preview dice "2 transacciones" pero al confirmar se crea **1 sola** con 2 ítems
- [ ] CSV con 2 filas con tickets distintos → se crean 2 transacciones separadas

### 5.5 Restricción para recepción
- [ ] Login como `recepcion1`. Subir CSV con una venta y una compra → la fila de compra cae en rojo "Tu rol solo permite registrar ventas"

**Notas / observaciones:**
> 

---

## 6. Casos límite y reversa de stock

- [ ] Eliminar una transacción tipo **compra** que cargó stock → el stock baja en la ubicación destino (verifica en `/inventario/[id]`)
- [ ] Eliminar un **traslado** → origen recupera stock, destino lo pierde
- [ ] Editar una venta cambiando cantidad de 2 → 5: stock del producto en esa ubicación baja 3 unidades adicionales
- [ ] Editar una venta cambiando el producto: el producto original recupera stock, el nuevo lo pierde
- [ ] Editar fallida: cambia una venta a un producto sin stock suficiente → debe aparecer error y la transacción ORIGINAL queda intacta (rollback funciona)
- [ ] Hacer un ajuste de inventario manual de un producto → queda registrado en "Historial de ajustes" en la ficha del producto, con motivo y notas

**Notas / observaciones:**
> 

---

## 7. UX general

- [ ] El logo de Prime Padel se ve grande y nítido en el nav
- [ ] El nav permanece sticky al hacer scroll
- [ ] En móvil/tablet (responsive): si tienes oportunidad, prueba el sitio en pantalla pequeña — al menos las pantallas más usadas (Transacciones y Nueva transacción)
- [ ] Toasts de éxito/error aparecen abajo a la derecha y desaparecen solos
- [ ] No hay errores visibles en la consola del navegador (`F12 → Console`)

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
