// Tipos del dominio. Alineados con supabase/schema.sql v2.
// Se refinarán cuando generemos tipos con `supabase gen types typescript`.

export type TipoItem = "producto" | "servicio";
export type TipoUbicacion = "bodega" | "nevera" | "barra" | "vitrina" | "oficina" | "otro";
export type TipoTransaccion = "compra" | "venta" | "traslado";
export type OrigenTransaccion = "manual" | "csv" | "api" | "migracion";
export type MotivoAjuste =
  | "conteo_fisico"
  | "merma"
  | "rotura"
  | "correccion"
  | "ingreso_inicial"
  | "otro";
export type TipoImpuesto = "iva" | "impoconsumo" | "ninguno" | "otro";
export type Rol = "admin" | "cajero";
export type EstadoStock = "sin_stock" | "stock_bajo" | "ok";

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activa: boolean;
}

export interface Impuesto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoImpuesto;
  porcentaje: number;
  codigo_origen: string | null;
  activo: boolean;
}

export interface ListaPrecios {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_default: boolean;
  orden: number;
  activa: boolean;
}

export interface Ubicacion {
  id: string;
  nombre: string;
  tipo: TipoUbicacion;
  descripcion: string | null;
  orden: number;
  activa: boolean;
}

export interface Producto {
  id: string;
  codigo: string | null;
  nombre: string;
  tipo: TipoItem;
  categoria_id: string | null;
  es_inventariable: boolean;
  stock_minimo_alerta: number;
  costo_unitario: number;
  impuesto_id: string | null;
  incluye_impuesto_en_precio: boolean;
  unidad_medida: string | null;
  descripcion_larga: string | null;
  referencia_fabrica: string | null;
  codigo_barras: string | null;
  marca: string | null;
  modelo: string | null;
  visible_en_factura: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrecioProducto {
  producto_id: string;
  lista_precio_id: string;
  precio: number;
}

export interface StockPorUbicacion {
  producto_id: string;
  ubicacion_id: string;
  cantidad: number;
  updated_at: string;
}

export interface VStockTotal {
  producto_id: string;
  codigo: string | null;
  nombre: string;
  tipo: TipoItem;
  es_inventariable: boolean;
  activo: boolean;
  stock_minimo_alerta: number;
  cantidad_total: number;
  costo_unitario: number;
  valor_total_costo: number;
  estado_stock: EstadoStock;
}

export interface Transaccion {
  id: string;
  tipo: TipoTransaccion;
  fecha: string;
  usuario_id: string | null;
  total: number;
  notas: string | null;
  origen: OrigenTransaccion;
  created_at: string;
}

export interface TransaccionItem {
  id: string;
  transaccion_id: string;
  producto_id: string;
  ubicacion_origen_id: string | null;
  ubicacion_destino_id: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  lista_precio_id: string | null;
}

export interface AjusteInventario {
  id: string;
  producto_id: string;
  ubicacion_id: string;
  cantidad_antes: number;
  cantidad_despues: number;
  diferencia: number;
  motivo: MotivoAjuste;
  notas: string | null;
  usuario_id: string | null;
  fecha: string;
}

export interface VentaHistoricaMensual {
  producto_id: string;
  anio: number;
  mes: number;
  cantidad_vendida: number;
  valor_bruto: number;
  descuento: number;
  subtotal: number;
  impuesto_cargo: number;
  impuesto_retencion: number;
  total: number;
  fuente: "alegra" | "manual" | "otro";
  importado_en: string;
}

export interface Perfil {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}
