'use client'

import { useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useMateriales } from '@/hooks/useMateriales'
import { usePedidos } from '@/hooks/usePedidos'
import KpiCard from '@/components/KpiCard'
import GraficoPedidos from '@/components/GraficoPedidos'
import EstadoBadge from '@/components/EstadoBadge'

export default function DashboardPage() {
  const { user } = useAuthContext()
  const { materiales, loading: loadingMat } = useMateriales(user?.uid)
  const { pedidos, loading: loadingPed } = usePedidos(user?.uid)

  const kpis = useMemo(() => {
    const stockTotal = materiales.reduce((sum, m) => sum + m.stock_gramos, 0)
    const valorStock = materiales.reduce((sum, m) => sum + (m.stock_gramos / 1000) * m.precio_por_kilo, 0)
    const pedidosActivos = pedidos.filter((p) => p.estado === 'Pendiente' || p.estado === 'En producción').length
    return { stockTotal, valorStock, pedidosActivos }
  }, [materiales, pedidos])

  const ultimosPedidos = pedidos.slice(0, 5)

  const isLoading = loadingMat || loadingPed

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general de tu emprendimiento</p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-24 animate-pulse">
              <div className="bg-slate-200 h-3 w-24 rounded mb-3" />
              <div className="bg-slate-200 h-7 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            titulo="Materiales registrados"
            valor={materiales.length}
            subtitulo="en total"
            colorIcono="bg-indigo-100 text-indigo-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            }
          />
          <KpiCard
            titulo="Stock total filamento"
            valor={`${kpis.stockTotal.toLocaleString()} g`}
            subtitulo={`${(kpis.stockTotal / 1000).toFixed(2)} kg`}
            colorIcono="bg-blue-100 text-blue-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            }
          />
          <KpiCard
            titulo="Pedidos activos"
            valor={kpis.pedidosActivos}
            subtitulo="Pendiente + En producción"
            colorIcono="bg-amber-100 text-amber-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
              </svg>
            }
          />
          <KpiCard
            titulo="Valor del stock"
            valor={`$${kpis.valorStock.toFixed(2)}`}
            subtitulo="estimado en USD"
            colorIcono="bg-emerald-100 text-emerald-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Gráfico + Últimos pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Gráfico de pedidos por estado */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pedidos por estado</h2>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse bg-slate-200 rounded w-full h-36" />
            </div>
          ) : (
            <GraficoPedidos pedidos={pedidos} />
          )}
        </div>

        {/* Últimos pedidos */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Últimos pedidos</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="bg-slate-200 h-4 flex-1 rounded" />
                  <div className="bg-slate-200 h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : ultimosPedidos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin pedidos aún</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {ultimosPedidos.map((p) => (
                <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.cliente_nombre}</p>
                    <p className="text-xs text-slate-400 truncate">{p.descripcion}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <EstadoBadge estado={p.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
