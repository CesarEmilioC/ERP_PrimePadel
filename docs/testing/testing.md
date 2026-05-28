# Testing pre-entrega — pulido final (T1–T7)

Checklist corto para validar **solo los cambios de esta tanda** antes de limpiar la BD con `supabase/reset-operacion.sql` y entregar. Si algo falla, anótalo debajo del check con `->`.

**URL:** https://erp-prime-padel.vercel.app/

**Cuentas:**

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `CesarC` | `CesarPP2026` | Maestro |
| `maestro` | `MaestroPP2026` | Maestro |
| `admin` | `AdminPP2026` | Admin |
| `recepcion1` | `RecepcionPP1` | Recepción |

> Para tener dos roles en paralelo: una ventana normal + una en incógnito.

---

## Antes de empezar (datos de prueba)

Necesitás que existan al menos:
- Una venta hecha por `recepcion1` (vieja, no de hoy).
- Una venta hecha por `recepcion1` hoy.
- Una venta de Maestro/Admin con tarifa Detal.
- Una venta de Maestro/Admin con tarifa Staff Prime (o cualquier no-Detal).
- Una venta de Maestro/Admin eligiendo **"Otro (personalizado)"** con un precio inventado.
- 2–3 compras recientes para que haya datos en utilidad.

Si no tenés esto, registralo primero como Maestro (toma 5 min).

---

## T1 — Recepción no puede editar/eliminar nada

Login como `recepcion1`.

- [ ] **Aviso visible**: en `/transacciones` aparece arriba un recuadro amarillo: *"⚠ Importante: no puedes editar ni eliminar transacciones..."*.
- [ ] **Ninguna fila** de la tabla (ni siquiera las suyas del día actual) muestra botones "Editar" / "Eliminar".
- [ ] **Intento por URL directa**: si conocés un id, abrí `/transacciones/<id>/editar` (o intentá disparar la acción desde el navegador). Debe rechazarlo el server. *(Opcional — la UI ya lo bloquea, pero la regla está en el servidor.)*

Login como `admin`:
- [ ] Sigue viendo "Editar" / "Eliminar" en transacciones que **no** fueron creadas por un Maestro.
- [ ] **NO** ve "Editar" / "Eliminar" en una transacción creada por `CesarC` (Maestro).

Login como `maestro`:
- [ ] Ve "Editar" / "Eliminar" en TODAS las transacciones.

---

## T2 — "Otro (personalizado)" solo para admin/maestro

Login como `recepcion1` → `/transacciones` → "+ Nueva transacción" → Venta.

- [ ] Al agregar un producto, el dropdown de tarifas muestra solo las tarifas activas de la BD (Detal, Staff Prime, Alternos, etc.).
- [ ] **NO aparece** la opción "Otro (personalizado)…".
- [ ] Al cambiar de tarifa el precio se autocompleta correctamente.

Login como `admin` o `maestro`:
- [ ] El dropdown **sí** incluye "Otro (personalizado)…" al final.
- [ ] Al elegirlo aparece el input de precio libre.

---

## T3 — La tarifa se guarda con la venta

Como `admin`/`maestro`, registrá 3 ventas del mismo producto:
1. Una con tarifa **Detal**.
2. Una con tarifa **Staff Prime** (o cualquier no-Detal).
3. Una con **Otro** y un precio inventado (ej. $9.999).

- [ ] Las 3 ventas aparecen en la tabla `/transacciones`.
- [ ] Andá a `/inventario/<ese producto>` → sección **Histórico de transacciones**:
  - La venta 1 muestra badge **"Detal"** en la columna Tarifa.
  - La venta 2 muestra badge con el nombre de la tarifa elegida.
  - La venta 3 muestra **"Otro / Personalizado"** en cursiva.

---

## T4 — Gráficas por tarifa responden a filtros

Login como `maestro` → `/dashboard` → tab **Ventas y consumo**.

- [ ] Bajando aparecen 2 gráficas nuevas en grid de 2 columnas: **Monto vendido por tarifa** y **Unidades vendidas por tarifa**.
- [ ] Cada gráfica muestra una barra por tarifa (Detal, Staff Prime, ...) + una barra "Otro / Personalizado" si hay ventas con precio libre.
- [ ] **Aplicá un filtro de Categoría** → las dos gráficas se recalculan.
- [ ] **Aplicá un filtro de Producto** → idem.
- [ ] **Aplicá filtro de Mes** o **Rango de fechas** → idem.
- [ ] **Limpiar filtros** → vuelven a mostrar todo.

---

## T5 — Utilidad descuenta el impuesto

Para que tenga efecto debe haber al menos un producto con **impuesto asignado** (ej. IVA 19% o Impoconsumo 8%) y al menos una venta + compra de ese producto.

Como `maestro`, `/dashboard` → tab **Ventas y consumo** → bajá a **"Utilidades brutas: costos vs ingresos"**.

- [ ] Arriba aparecen **4 KPI cards** (antes eran 3): Ingresos netos / Impuestos descontados / Costos totales / Utilidad bruta.
- [ ] Nota amarilla visible: *"ⓘ A los ingresos ya se les descontó el impuesto asignado..."*.
- [ ] La tabla **Utilidad por producto/servicio** tiene 3 columnas nuevas: **Ingresos brutos**, **Impuestos**, **Ingresos netos**.
- [ ] Verificá la fórmula manual en una fila: si un producto con IVA 19% vendió $11.900 brutos, los impuestos deberían dar ≈ $1.900 y los netos ≈ $10.000. Si no tiene impuesto, "Impuestos" muestra "—" y bruto = neto.
- [ ] La columna **Utilidad** = Ingresos netos − Costos.

---

## T6 — Filtro de tarifa multi en `/transacciones`

Login como `admin` o `maestro` → `/transacciones`.

- [ ] Entre los filtros aparece **"Tarifa (solo ventas)"** como multi-select.
- [ ] El dropdown lista las tarifas activas de la BD + opción **"Otro / Personalizado"**.
- [ ] Seleccionando "Detal" → la tabla muestra **solo ventas** con esa tarifa.
- [ ] Seleccionando "Otro / Personalizado" → muestra solo las ventas con precio libre.
- [ ] Si seleccionás Tipo = `compra` y una tarifa cualquiera → tabla vacía (compras no tienen tarifa).
- [ ] **Limpiar filtros** también resetea Tarifas.

---

## T7 — Histórico de transacciones en ficha de producto

Como `maestro`, andá a `/inventario/<id de un producto que tenga ventas + compras>` → sección **Histórico de transacciones**.

- [ ] Las columnas son: Fecha · Tipo · Ubicación · Cantidad · **Valor unit.** · **Tarifa** · Subtotal · Notas. **NO** hay columna "Costo unit." ni "Precio unit." separadas.
- [ ] En filas de **compra**: "Valor unit." = el costo que registraste. "Tarifa" muestra "—".
- [ ] En filas de **venta**: "Valor unit." = el precio cobrado al cliente. "Tarifa" muestra el badge con el nombre, o "Otro / Personalizado".
- [ ] En filas de **traslado**: "Valor unit." y "Subtotal" muestran "—", "Tarifa" muestra "—".
- [ ] La descripción arriba de la tabla explica los cambios.

---

## Verificación cruzada (rápida)

- [ ] Registrá una venta nueva → andá al dashboard → la gráfica "Monto por tarifa" subió.
- [ ] La misma venta aparece en el filtro de tarifa de `/transacciones`.
- [ ] La misma venta aparece en el histórico del producto con la tarifa correcta.
- [ ] No hay errores en la consola del navegador (F12 → Console).

---

## Si todo está OK

1. Anotá cualquier ajuste menor abajo (formato `-> ...`).
2. Corré `supabase/reset-operacion.sql` desde el SQL Editor de Supabase para limpiar todas las transacciones, ajustes y stock de pruebas (preserva catálogo, tarifas, usuarios y el histórico de Alegra).
3. Entregá al cliente con los manuales actualizados.

---

## Notas / hallazgos

(Anotá acá lo que encuentres con `->`)

-
