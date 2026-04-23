# Cotización — Sistema ERP de Inventario

**Cliente:** Prime Padel Club
**Ciudad:** Cali, Colombia
**Fecha de emisión:** 23 de abril de 2026
**Válida hasta:** 7 de mayo de 2026
**Proveedor:** Cesar Emilio Castaño Marin — Desarrollo de software a la medida

---

## 1. Objeto de la propuesta

Desarrollo e implementación de un **ERP web a la medida** para el control de inventario, registro de compras/ventas y análisis de consumo del club Prime Padel. La plataforma estará alojada en la nube, operará desde cualquier navegador (PC, tablet, móvil) y será utilizada diariamente por el personal de caja y la administración del club.

El sistema reemplaza procesos manuales de hoja de cálculo y centraliza en un único lugar el inventario de bebidas (alcohólicas y no alcohólicas), mecato, cafetería, implementos de pádel, y los servicios del club (clases, alquileres, torneos, academias, patrocinios).

---

## 2. Estructura de entrega en dos fases

Para agilizar la puesta en producción, el proyecto se entrega en dos fases claramente delimitadas.

### Fase 1 — **MVP (entrega inmediata al firmar)**

Sistema funcional con los módulos críticos para operación diaria. **Ya construido y disponible para demostración al cliente.**

### Fase 2 — **Versión completa**

Funcionalidades avanzadas, carga masiva, autenticación con roles, y gráficas adicionales del dashboard. Se entrega dentro del mismo cronograma de 10 días hábiles.

---

## 3. Alcance funcional

### 3.1 Gestión de inventario

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| Listado de productos y servicios | ✅ | ✅ |
| Crear, editar y eliminar productos con confirmación | ✅ | ✅ |
| Separación entre productos inventariables y servicios | ✅ | ✅ |
| Múltiples precios por producto (Detal, Equipo Prime, profesores) | ✅ | ✅ |
| Impuestos de referencia (IVA 19%, Impoconsumo 8%) | ✅ | ✅ |
| Filtros multi-selección: categoría, ubicación, tipo, estado de stock | ✅ | ✅ |
| Filtros por rango de cantidad | ✅ | ✅ |
| Búsqueda por nombre y código | ✅ | ✅ |
| Detalle de producto con stock por ubicación | ✅ | ✅ |
| Histórico de ventas mensuales por producto | ✅ | ✅ |
| Ajuste de inventario (conteo físico, mermas, roturas) con auditoría | ✅ | ✅ |
| Auditoría completa de ajustes (quién, cuándo, por qué) | ✅ | ✅ |
| Alertas visuales de stock bajo y sin stock | ✅ | ✅ |

### 3.2 Ubicaciones físicas

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| CRUD de ubicaciones (bodega, nevera, barra, vitrina, oficina, otro) | ✅ | ✅ |
| Asignación de stock por ubicación | ✅ | ✅ |
| Protección contra borrado (soft-delete si tiene movimientos) | ✅ | ✅ |

### 3.3 Categorías

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| CRUD de categorías | ✅ | ✅ |
| Conteo de productos por categoría | ✅ | ✅ |
| Protección contra borrado | ✅ | ✅ |

### 3.4 Transacciones (compras y ventas)

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| Registro individual de ventas | ✅ | ✅ |
| Registro individual de compras / ingresos | ✅ | ✅ |
| Múltiples ítems por transacción | ✅ | ✅ |
| Ajuste automático de stock | ✅ | ✅ |
| Validación de stock suficiente antes de vender | ✅ | ✅ |
| Eliminación de transacciones con reversa automática de stock | ✅ | ✅ |
| Filtro por tipo (venta / compra) | ✅ | ✅ |
| Traslado de stock entre ubicaciones | — | ✅ |
| **Carga masiva por CSV con preview y validación** | — | ✅ |
| **Edición de transacciones existentes** | — | ✅ |

### 3.5 Dashboard analítico

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| KPIs principales (productos, stock, alertas, variación) | ✅ | ✅ |
| Gráfica: consumo mensual (monto y cantidades) | ✅ | ✅ |
| Gráfica: top 10 productos más vendidos | ✅ | ✅ |
| Gráfica: distribución por categoría | ✅ | ✅ |
| Gráfica: tendencia mensual (dual cantidad/monto) | ✅ | ✅ |
| Filtros globales multi-selección | ✅ | ✅ |
| Filtro por rango de fechas | ✅ | ✅ |
| **Gráfica: top productos por día de la semana** | — | ✅ |
| **Gráfica: consumo en cantidades vs dinero (paginable)** | — | ✅ |
| **Leyendas colapsables tras botón** | — | ✅ |
| **Pestañas de dashboard específicas (inventario / ventas / alertas)** | — | ✅ |
| **Alerta estructurada de stock bajo por ubicación** | — | ✅ |

### 3.6 Autenticación y control de acceso

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| **Login con usuario y contraseña** | — | ✅ |
| **Rol administrador (acceso total)** | — | ✅ |
| **Rol cajero (sin dashboard ni borrado de transacciones)** | — | ✅ |
| **Gestión de usuarios desde el sistema** | — | ✅ |

### 3.7 Migración e importación de datos

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| Migración del catálogo de Alegra | ✅ | ✅ |
| Normalización de 16 categorías (dedupe y corrección de tipos) | ✅ | ✅ |
| Migración del histórico de ventas mensuales (OCT 2025 – ABR 2026) | ✅ | ✅ |
| Preservación de servicios inactivos históricos | ✅ | ✅ |
| **Importación del inventario inicial físico (cantidades por ubicación)** | — | ✅ |

### 3.8 Documentación

| Funcionalidad | MVP | Completo |
|---------------|:---:|:--------:|
| Documentación técnica del sistema | ✅ | ✅ |
| Manual de usuario — módulos del MVP | ✅ | ✅ |
| Manual de usuario — módulos avanzados | — | ✅ |
| Capacitación remota al equipo del club | — | ✅ |

---

## 4. Alcance técnico

| Componente | Tecnología |
|------------|-----------|
| Aplicación web | Next.js 15 + TypeScript |
| Interfaz de usuario | Tailwind CSS + componentes propios |
| Base de datos y autenticación | Supabase (PostgreSQL gestionado) |
| Hosting | Vercel (SSL incluido, auto-escalable) |
| Gráficas | Recharts |
| Procesamiento de CSV | Papa Parse + Zod |

**Características del despliegue:**
- Aplicación disponible 24/7 en URL dedicada.
- Copias de seguridad automáticas de la base de datos (provistas por Supabase).
- Conexión cifrada (HTTPS).
- Lógica transaccional atómica en PostgreSQL: las ventas ajustan stock en la misma operación SQL, evitando inconsistencias.
- Auditoría completa de ajustes de inventario (quién, cuándo, motivo).

---

## 5. Identidad visual

La interfaz respeta la marca Prime Padel:
- Negro, blanco y grises del logo como base.
- Amarillo Prime como acento principal.
- Naranja pastel y naranja vivo para llamados a la acción y estados activos.
- Logo incorporado en la barra de navegación principal.

---

## 6. Cronograma

**Factor clave:** el cliente requiere la plataforma operativa en mayo de 2026. Por ello se trabaja bajo un cronograma **acelerado e intensivo**, concentrando el desarrollo en una ventana de 10 días hábiles. El uso de frameworks y servicios gestionados (Next.js 15, Supabase, Vercel) permite esta velocidad sin sacrificar calidad.

| Etapa | Estado | Descripción |
|-------|:------:|-------------|
| Arquitectura base y despliegue | ✅ | Proyecto, base de datos, identidad visual |
| Migración del catálogo e histórico | ✅ | 145 productos, 394 ventas mensuales migradas |
| **MVP — Módulos críticos** | ✅ | Inventario, transacciones, ubicaciones, categorías, dashboard base |
| **Versión completa** | 🔄 | Carga CSV, autenticación RBAC, gráficas avanzadas, edición de transacciones, traslados |
| Pruebas integrales y pulido | 🔄 | QA funcional, responsive, UX |
| Despliegue final y validación | 🔄 | Validación con el cliente en producción |
| Capacitación | 🔄 | Sesión de 1 hora + manual completo |

---

## 7. Inversión

| Concepto | Valor (COP) |
|----------|-------------|
| Desarrollo completo del ERP (alcance descrito en las secciones 3 y 4) | **$ 1.750.000,00** |

### Forma de pago

| Componente | Valor |
|-----------|-------|
| En efectivo / transferencia | **$ 1.250.000,00 COP** |
| En especie — 5 clases de pádel (en pareja o individuales) | **$ 500.000,00 COP** (valoradas a $ 100.000,00 COP cada una) |
| **Total** | **$ 1.750.000,00 COP** |

**Esquema de desembolso en efectivo:**
- **50 % de anticipo** ($ 625.000,00 COP) al firmar esta propuesta — habilita inicio del desarrollo y la entrega del **MVP** funcional para demostración inmediata.
- **50 % contra entrega** ($ 625.000,00 COP) al momento de la entrega final de la versión completa y validación por parte del cliente.
- Las 4 clases de pádel se agendan a conveniencia del proveedor dentro de los 60 días siguientes a la entrega.

### Lo que incluye el valor cotizado
- Todo el desarrollo descrito en las secciones 3 y 4.
- Migración completa de los datos del cliente (catálogo e histórico).
- Despliegue en producción y configuración de infraestructura.
- Documentación técnica y manual de usuario.
- Capacitación al equipo (sesión remota o presencial, 1 hora).
- **Soporte correctivo de 15 días calendario** posteriores a la entrega final, para corrección de errores propios del desarrollo.

### Lo que NO está incluido
- Costos recurrentes de infraestructura posteriores al primer mes (Vercel y Supabase ofrecen plan gratuito suficiente para la operación inicial; si en el futuro el uso exige un plan pago, el costo corre por cuenta del cliente — estimado: 0 a USD 25 mensuales).
- Nuevas funcionalidades solicitadas después de iniciado el desarrollo o posteriores a la entrega.
- Integraciones con sistemas externos (pasarelas de pago, facturación electrónica DIAN, sistemas de reserva de canchas).
- Soporte y mantenimiento después del periodo de 15 días — disponible como servicio adicional.

---

## 8. Condiciones adicionales

- Los cambios de alcance solicitados después de la aprobación de esta propuesta se cotizan aparte a una tarifa de **$ 70.000,00 COP por hora**.
- Servicios posteriores a la entrega (mantenimiento, soporte continuo, nuevas funcionalidades) pueden contratarse por hora o mediante un plan mensual, previo acuerdo.
- La propiedad intelectual del código desarrollado se transfiere al cliente una vez recibido el pago total.
- El cliente debe entregar a la brevedad el inventario físico inicial (cantidades por ubicación) para que el sistema refleje la realidad operativa. Mientras tanto el MVP opera con cantidades en cero por ubicación, a la espera de la carga.

---

## 9. Aceptación

La firma o confirmación por escrito (correo electrónico, WhatsApp) de esta propuesta, junto con la consignación del anticipo del 50 %, da inicio formal al desarrollo de la versión completa. El MVP está disponible para demostración **al momento de la firma**.

---

**Contacto:**
Cesar Emilio Castaño Marin — cesarxemiliox@gmail.com — +52 812 346 6691

_Gracias por la confianza. Esta propuesta está diseñada para entregar a Prime Padel una herramienta confiable, moderna y alineada con la identidad del club, en el menor tiempo posible._
