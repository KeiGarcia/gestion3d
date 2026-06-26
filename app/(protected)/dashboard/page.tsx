'use client'

import { useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useMateriales } from '@/hooks/useMateriales'
import { usePedidos } from '@/hooks/usePedidos'
import { esFilamento } from '@/lib/types'
import KpiCard from '@/components/KpiCard'
import GraficoPedidos from '@/components/GraficoPedidos'
import GraficoIngresos from '@/components/GraficoIngresos'
import EstadoBadge from '@/components/EstadoBadge'
import { ars } from '@/lib/format'

export default function DashboardPage() {
  const { user } = useAuthContext()
  const { materiales, loading: loadingMat } = useMateriales(user?.uid)
  const { pedidos, loading: loadingPed } = usePedidos(user?.uid)

  const kpis = useMemo(() => {
    const filamentos = materiales.filter(esFilamento)
    const stockTotal = filamentos.reduce((sum, m) => sum + m.stock_gramos, 0)
    const valorStock = filamentos.reduce((sum, m) => sum + (m.stock_gramos / 1000) * m.precio_por_kilo, 0)
    const pedidosActivos = pedidos.filter((p) => p.estado === 'Pendiente' || p.estado === 'En producción').length
    const ingresos = pedidos
      .filter((p) => (p.estado === 'Completado' || p.estado === 'Entregado') && p.precio_acordado != null)
      .reduce((sum, p) => sum + (p.precio_acordado ?? 0), 0)
    const pedidosCompletados = pedidos.filter((p) => p.estado === 'Completado' || p.estado === 'Entregado').length
    return { stockTotal, valorStock, pedidosActivos, ingresos, pedidosCompletados }
  }, [materiales, pedidos])

  const alertasPedidos = useMemo(() => {
    const hoy = new Date()
    const en3dias = new Date(hoy)
    en3dias.setDate(hoy.getDate() + 3)
    const hoyStr = hoy.toISOString().split('T')[0]
    const en3diasStr = en3dias.toISOString().split('T')[0]
    return pedidos
      .filter((p) =>
        (p.estado === 'Pendiente' || p.estado === 'En producción') &&
        p.fecha_entrega >= hoyStr &&
        p.fecha_entrega <= en3diasStr
      )
      .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
  }, [pedidos])

  const top5Productos = useMemo(() => {
    const conteo: Record<string, { label: string; cant: number }> = {}
    pedidos
      .filter((p) => p.estado === 'Completado' || p.estado === 'Entregado')
      .forEach((p) => {
        const key = p.productoId ?? p.descripcion
        const label = p.descripcion.length > 40 ? p.descripcion.slice(0, 40) + '…' : p.descripcion
        if (!conteo[key]) conteo[key] = { label, cant: 0 }
        conteo[key].cant += p.cantidad
      })
    return Object.values(conteo).sort((a, b) => b.cant - a.cant).slice(0, 5)
  }, [pedidos])

  const ultimosPedidos = pedidos.slice(0, 5)
  const isLoading = loadingMat || loadingPed

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general de tu emprendimiento</p>
      </div>

      {/* Alerta pedidos próximos a vencer */}
      {!isLoading && alertasPedidos.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {alertasPedidos.length} pedido{alertasPedidos.length !== 1 ? 's' : ''} vence{alertasPedidos.length !== 1 ? 'n' : ''} en los próximos 3 días
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {alertasPedidos.map((p) => (
                <span key={p.id} className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                  {p.cliente_nombre} — {p.fecha_entrega}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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
            subtitulo="en inventario"
            colorIcono="bg-indigo-100 text-indigo-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            }
          />
          <KpiCard
            titulo="Stock total filamento"
            valor={`${kpis.stockTotal.toLocaleString('es-AR')} g`}
            subtitulo={`${(kpis.stockTotal / 1000).toFixed(2)} kg · val. ${ars(kpis.valorStock)}`}
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
            titulo="Ingresos registrados"
            valor={ars(kpis.ingresos)}
            subtitulo={`${kpis.pedidosCompletados} pedido${kpis.pedidosCompletados !== 1 ? 's' : ''} completado${kpis.pedidosCompletados !== 1 ? 's' : ''}`}
            colorIcono="bg-emerald-100 text-emerald-600"
            icono={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Gráfico pedidos + Últimos pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pedidos por estado</h2>
          {isLoading ? (
            <div className="animate-pulse bg-slate-200 rounded w-full h-36" />
          ) : (
            <GraficoPedidos pedidos={pedidos} />
          )}
        </div>

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
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {p.precio_acordado != null && (
                      <span className="text-xs font-semibold text-emerald-600">{ars(p.precio_acordado)}</span>
                    )}
                    <EstadoBadge estado={p.estado} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ingresos por mes + Top 5 productos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ingresos por mes (últimos 6 meses)</h2>
          {isLoading ? (
            <div className="animate-pulse bg-slate-200 rounded w-full h-48" />
          ) : (
            <GraficoIngresos pedidos={pedidos} />
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top 5 productos</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="bg-slate-200 h-3 flex-1 rounded" />
                  <div className="bg-slate-200 h-3 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : top5Productos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin pedidos completados aún</p>
          ) : (
            <div className="space-y-2">
              {top5Productos.map(({ label, cant }, i) => {
                const max = top5Productos[0].cant
                const pct = Math.round((cant / max) * 100)
                return (
                  <div key={label + i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium truncate flex-1 mr-2">
                        <span className="text-slate-400 mr-1.5">#{i + 1}</span>{label}
                      </span>
                      <span className="text-slate-500 flex-shrink-0">{cant} ud.</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
