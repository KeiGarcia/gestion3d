'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Pedido } from '@/lib/types'

interface Props {
  pedidos: Pedido[]
}

export default function GraficoIngresos({ pedidos }: Props) {
  const data = useMemo(() => {
    const ahora = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
      const mes = fecha.toLocaleString('es-AR', { month: 'short', year: '2-digit' })
      const ingresos = pedidos
        .filter((p) => {
          if ((p.estado !== 'Completado' && p.estado !== 'Entregado') || !p.precio_acordado) return false
          const d = p.createdAt?.toDate?.()
          if (!d) return false
          return d.getFullYear() === fecha.getFullYear() && d.getMonth() === fecha.getMonth()
        })
        .reduce((sum, p) => sum + (p.precio_acordado ?? 0), 0)
      return { mes, ingresos }
    })
  }, [pedidos])

  const hasDatos = data.some((d) => d.ingresos > 0)

  if (!hasDatos) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-slate-400">
        Sin ingresos registrados aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
        />
        <Bar dataKey="ingresos" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
