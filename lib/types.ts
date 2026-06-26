import { Timestamp } from 'firebase/firestore'

export type TipoMaterial = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'Resina' | 'Nylon' | 'Bolsa' | 'Caja' | 'Hardware' | 'Pintura' | 'Adhesivo' | 'Otro'
export type UnidadMaterial = 'g' | 'ud'
export type EstadoPedido =
  | 'Pendiente'
  | 'En producción'
  | 'Completado'
  | 'Entregado'
  | 'Cancelado'         // legacy
  | 'Cancelado - POS'  // cancelado después de producir (stock ya consumido)
  | 'Cancelado - PRE'  // cancelado antes de imprimir (stock se restaura si venía de Completado)

export interface Material {
  id?: string
  userId: string
  nombre: string
  tipo: TipoMaterial
  color: string
  marca?: string
  stock_gramos: number      // gramos si unidad='g', unidades si unidad='ud'
  precio_por_kilo: number   // $/kg si unidad='g', $/unidad si unidad='ud'
  proveedor: string
  punto_reposicion: number
  unidad?: UnidadMaterial   // undefined = 'g' (retrocompatible)
  createdAt?: Timestamp
}

export interface FilamentoPedido {
  materialId: string
  consumo_gramos: number  // gramos POR UNIDAD de producto
}

export interface InsumoUsado {
  materialId: string
  cantidad: number         // unidades POR UNIDAD de producto
}

export interface Pedido {
  id?: string
  userId: string
  productoId?: string       // referencia al Producto
  cliente_nombre: string
  cliente_telefono?: string
  cliente_email?: string
  descripcion: string
  cantidad: number
  materiales?: FilamentoPedido[]   // receta por unidad
  insumos?: InsumoUsado[]          // receta por unidad
  // Legacy fields (backward compat)
  materialId?: string
  consumo_gramos?: number
  fecha_entrega: string
  estado: EstadoPedido
  precio_acordado?: number
  notas?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Cliente {
  id?: string
  userId: string
  nombre: string
  telefono?: string
  email?: string
  notas?: string
  createdAt?: Timestamp
}

export interface Producto {
  id?: string
  userId: string
  nombre: string
  descripcion?: string
  // Receta (snapshot desde calculadora)
  filamentos?: FilamentoPedido[]
  insumos?: InsumoUsado[]
  tiempo_horas?: number
  tiempo_horas_estimado?: number   // legacy de productos manuales
  costo_total?: number
  precio_venta?: number      // precio decidido por el usuario
  precio_sugerido?: number   // legacy / precio calculado original
  margen_real?: number       // (precio_venta - costo_total) / precio_venta * 100
  notas?: string
  createdAt?: Timestamp
}

export interface Configuracion {
  id?: string
  userId: string
  costo_energia_hora: number
  costo_amortizacion_hora: number
  costo_mano_obra_hora: number
  margen_ganancia_default: number
  costo_packaging_default: number
}

export interface ResultadoCalculo {
  costo_filamento: number
  costo_energia: number
  costo_amortizacion: number
  costo_mano_obra: number
  costo_packaging: number
  costo_insumos: number
  costo_total: number
  precio_sugerido: number
  ganancia: number
}

export const TIPOS_FILAMENTO: TipoMaterial[] = ['PLA', 'ABS', 'PETG', 'TPU', 'Resina', 'Nylon', 'Otro']
export const TIPOS_INSUMO: TipoMaterial[] = ['Bolsa', 'Caja', 'Hardware', 'Pintura', 'Adhesivo', 'Otro']
export const TIPOS_MATERIAL: TipoMaterial[] = ['PLA', 'ABS', 'PETG', 'TPU', 'Resina', 'Nylon', 'Bolsa', 'Caja', 'Hardware', 'Pintura', 'Adhesivo', 'Otro']

export const ESTADOS_PEDIDO: EstadoPedido[] = ['Pendiente', 'En producción', 'Completado', 'Entregado', 'Cancelado - POS', 'Cancelado - PRE']

// Returns the allowed next states from a given current state (always includes current state first)
export function estadosDisponibles(estadoActual: EstadoPedido): EstadoPedido[] {
  if (estadoActual === 'Completado') {
    // Show current state + allowed transitions (re-selecting Completado is safe — cambiarEstado guards against double deduction)
    return ['Completado', 'Entregado', 'Cancelado - POS', 'Cancelado - PRE']
  }
  // Terminal states — no further transitions
  if (
    estadoActual === 'Entregado' ||
    estadoActual === 'Cancelado' ||
    estadoActual === 'Cancelado - POS' ||
    estadoActual === 'Cancelado - PRE'
  ) {
    return [estadoActual]
  }
  // Pre-Completado: libre transición + cancelado-PRE sin reintegro de stock
  return ['Pendiente', 'En producción', 'Completado', 'Cancelado - PRE']
}

export function esTerminal(estado: EstadoPedido): boolean {
  return ['Entregado', 'Cancelado', 'Cancelado - POS', 'Cancelado - PRE'].includes(estado)
}

export function esFilamento(m: Pick<Material, 'unidad'>): boolean {
  return (m.unidad ?? 'g') === 'g'
}

export function normalizarFilamentos(pedido: Pedido): FilamentoPedido[] {
  if (pedido.materiales && pedido.materiales.length > 0) return pedido.materiales
  if (pedido.materialId) return [{ materialId: pedido.materialId, consumo_gramos: pedido.consumo_gramos ?? 0 }]
  return []
}

export function totalConsumo(pedido: Pedido): number {
  return normalizarFilamentos(pedido).reduce((sum, f) => sum + f.consumo_gramos, 0)
}

export function labelMaterial(m: Pick<Material, 'marca' | 'tipo' | 'color' | 'precio_por_kilo' | 'unidad'>): string {
  const partes = [m.marca, m.tipo, m.color].filter(Boolean)
  const precio = m.precio_por_kilo.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const unidadLabel = (m.unidad ?? 'g') === 'g' ? '/kg' : '/ud'
  return `${partes.join(' ')} — $${precio}${unidadLabel}`
}
