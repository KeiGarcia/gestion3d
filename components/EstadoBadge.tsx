import type { EstadoPedido } from '@/lib/types'

const COLORES: Record<EstadoPedido, string> = {
  'Pendiente':        'bg-amber-100 text-amber-700',
  'En producción':    'bg-blue-100 text-blue-700',
  'Completado':       'bg-emerald-100 text-emerald-700',
  'Entregado':        'bg-slate-100 text-slate-600',
  'Cancelado':        'bg-red-100 text-red-600',
  'Cancelado - POS':  'bg-red-100 text-red-700',
  'Cancelado - PRE':  'bg-orange-100 text-orange-700',
}

export default function EstadoBadge({ estado }: { estado: EstadoPedido }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLORES[estado] ?? 'bg-slate-100 text-slate-600'}`}>
      {estado}
    </span>
  )
}
