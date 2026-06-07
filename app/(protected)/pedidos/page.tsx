'use client'

import { useState, useMemo } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { usePedidos } from '@/hooks/usePedidos'
import { useMateriales } from '@/hooks/useMateriales'
import FormPedido from '@/components/FormPedido'
import EstadoBadge from '@/components/EstadoBadge'
import type { Pedido, EstadoPedido } from '@/lib/types'
import { ESTADOS_PEDIDO } from '@/lib/types'

type FiltroEstado = 'Todos' | EstadoPedido

export default function PedidosPage() {
  const { user } = useAuthContext()
  const { pedidos, loading: loadingPed, agregarPedido, cambiarEstado } = usePedidos(user?.uid)
  const { materiales, loading: loadingMat } = useMateriales(user?.uid)

  const [filtro, setFiltro] = useState<FiltroEstado>('Todos')
  const [modalForm, setModalForm] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)

  const pedidosFiltrados = useMemo(() => {
    if (filtro === 'Todos') return pedidos
    return pedidos.filter((p) => p.estado === filtro)
  }, [pedidos, filtro])

  const contadores = useMemo(() => {
    const c: Record<string, number> = { Todos: pedidos.length }
    for (const e of ESTADOS_PEDIDO) {
      c[e] = pedidos.filter((p) => p.estado === e).length
    }
    return c
  }, [pedidos])

  async function handleAgregar(data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    await agregarPedido({ ...data, userId: user.uid })
    setModalForm(false)
  }

  async function handleCambiarEstado(pedidoId: string, nuevoEstado: EstadoPedido, pedido: Pedido) {
    setCambiandoEstado(pedidoId)
    try {
      await cambiarEstado(pedidoId, nuevoEstado, pedido)
    } finally {
      setCambiandoEstado(null)
    }
  }

  function nombreMaterial(materialId: string) {
    return materiales.find((m) => m.id === materialId)?.nombre ?? materialId
  }

  const isLoading = loadingPed || loadingMat

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Pedidos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} registrado{pedidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo pedido
        </button>
      </div>

      {/* Filtros por estado */}
      <div className="flex flex-wrap gap-2">
        {(['Todos', ...ESTADOS_PEDIDO] as FiltroEstado[]).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltro(estado)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filtro === estado
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {estado}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
              filtro === estado ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {contadores[estado] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="flex gap-3 items-start">
                <div className="bg-slate-200 h-4 flex-1 rounded" />
                <div className="bg-slate-200 h-4 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
          </svg>
          <p className="text-slate-500 text-sm">Sin pedidos {filtro !== 'Todos' ? `con estado "${filtro}"` : 'registrados'}</p>
          {filtro === 'Todos' && (
            <button
              onClick={() => setModalForm(true)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Crear el primer pedido →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => (
            <div key={pedido.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Info principal */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-900">{pedido.cliente_nombre}</h3>
                      <EstadoBadge estado={pedido.estado} />
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{pedido.descripcion}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-400">
                      <span>Cantidad: <span className="font-medium text-slate-600">{pedido.cantidad}</span></span>
                      <span>Material: <span className="font-medium text-slate-600">{nombreMaterial(pedido.materialId)}</span></span>
                      <span>Consumo: <span className="font-medium text-slate-600">{pedido.consumo_gramos} g</span></span>
                      <span>Entrega: <span className="font-medium text-slate-600">{pedido.fecha_entrega}</span></span>
                    </div>
                  </div>

                  {/* Selector de estado */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Cambiar estado</label>
                    <select
                      value={pedido.estado}
                      disabled={cambiandoEstado === pedido.id}
                      onChange={(e) => handleCambiarEstado(pedido.id!, e.target.value as EstadoPedido, pedido)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-60 cursor-pointer"
                    >
                      {ESTADOS_PEDIDO.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                    {cambiandoEstado === pedido.id && (
                      <p className="text-xs text-slate-400 mt-1 text-center">Actualizando...</p>
                    )}
                  </div>
                </div>

                {/* Aviso descuento stock al completar */}
                {pedido.estado === 'Completado' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Stock de material descontado automáticamente ({pedido.consumo_gramos} g)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo pedido */}
      {modalForm && (
        <FormPedido
          materiales={materiales}
          onGuardar={handleAgregar}
          onCancelar={() => setModalForm(false)}
        />
      )}
    </div>
  )
}
