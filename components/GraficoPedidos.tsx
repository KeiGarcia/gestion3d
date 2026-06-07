'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { EstadoPedido } from '@/lib/types'

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  'Pendiente':     '#f59e0b',
  'En producción': '#3b82f6',
  'Completado':    '#10b981',
  'Entregado':     '#64748b',
  'Cancelado':     '#ef4444',
}

interface GraficoPedidosProps {
  pedidos: { estado: EstadoPedido }[]
}

export default function GraficoPedidos({ pedidos }: GraficoPedidosProps) {
  const conteo: Record<string, number> = {}
  for (const p of pedidos) {
    conteo[p.estado] = (conteo[p.estado] ?? 0) + 1
  }

  const data = Object.entries(conteo).map(([estado, cantidad]) => ({ estado, cantidad }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        Sin datos de pedidos aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value) => [value, 'Pedidos']}
        />
        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.estado}
              fill={COLORES_ESTADO[entry.estado as EstadoPedido] ?? '#6366f1'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
