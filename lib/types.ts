import { Timestamp } from 'firebase/firestore'

export type TipoMaterial = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'Resina' | 'Nylon' | 'Otro'
export type EstadoPedido = 'Pendiente' | 'En producción' | 'Completado' | 'Entregado' | 'Cancelado'

export interface Material {
  id?: string
  userId: string
  nombre: string
  tipo: TipoMaterial
  color: string
  stock_gramos: number
  precio_por_kilo: number
  proveedor: string
  punto_reposicion: number
  createdAt?: Timestamp
}

export interface Pedido {
  id?: string
  userId: string
  cliente_nombre: string
  descripcion: string
  cantidad: number
  materialId: string
  consumo_gramos: number
  fecha_entrega: string
  estado: EstadoPedido
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

export interface Configuracion {
  id?: string
  userId: string
  costo_energia_hora: number
  costo_amortizacion_hora: number
  costo_mano_obra_hora: number
  margen_ganancia_default: number
}

export interface ResultadoCalculo {
  costo_filamento: number
  costo_energia: number
  costo_amortizacion: number
  costo_mano_obra: number
  costo_total: number
  precio_sugerido: number
}

export const TIPOS_MATERIAL: TipoMaterial[] = ['PLA', 'ABS', 'PETG', 'TPU', 'Resina', 'Nylon', 'Otro']
export const ESTADOS_PEDIDO: EstadoPedido[] = ['Pendiente', 'En producción', 'Completado', 'Entregado', 'Cancelado']
