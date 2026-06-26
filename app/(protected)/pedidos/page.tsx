'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { usePedidos } from '@/hooks/usePedidos'
import { useMateriales } from '@/hooks/useMateriales'
import { useProductos } from '@/hooks/useProductos'
import { useClientes } from '@/hooks/useClientes'
import FormPedido from '@/components/FormPedido'
import EstadoBadge from '@/components/EstadoBadge'
import type { Pedido, EstadoPedido, Material } from '@/lib/types'
import { ESTADOS_PEDIDO, estadosDisponibles, esTerminal, normalizarFilamentos, totalConsumo } from '@/lib/types'
import { ars } from '@/lib/format'

type FiltroEstado = 'Todos' | EstadoPedido

function nombreCortoMaterial(m: Material): string {
  return [m.marca, m.tipo, m.color].filter(Boolean).join(' ')
}

function exportarCSVPedidos(pedidos: Pedido[]) {
  const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const headers = ['Cliente', 'Teléfono', 'Email', 'Descripción', 'Cantidad', 'Estado', 'Fecha entrega', 'Precio acordado', 'Notas']
  const rows = pedidos.map((p) => [
    p.cliente_nombre, p.cliente_telefono ?? '', p.cliente_email ?? '', p.descripcion,
    p.cantidad, p.estado, p.fecha_entrega,
    p.precio_acordado?.toFixed(2) ?? '', p.notas ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.map(quote).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function PedidosPage() {
  const { user } = useAuthContext()
  const { pedidos, loading: loadingPed, agregarPedido, actualizarPedido, cambiarEstado } = usePedidos(user?.uid)
  const { materiales, loading: loadingMat } = useMateriales(user?.uid)
  const { productos, loading: loadingProd } = useProductos(user?.uid)
  const { clientes, agregarCliente } = useClientes(user?.uid)

  const [filtro, setFiltro] = useState<FiltroEstado>('Todos')
  const [modalForm, setModalForm] = useState(false)
  const [pedidoEditar, setPedidoEditar] = useState<Pedido | null>(null)
  const [prefill, setPrefill] = useState<Partial<Pedido> & { productoId?: string } | null>(null)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null)

  useEffect(() => {
    const prodData = sessionStorage.getItem('prod_prefill')
    if (prodData) {
      sessionStorage.removeItem('prod_prefill')
      try {
        const parsed = JSON.parse(prodData) as { productoId?: string }
        if (parsed.productoId) {
          setPrefill({ productoId: parsed.productoId })
          setModalForm(true)
        }
      } catch {}
    }
  }, [])

  const pedidosFiltrados = useMemo(() => {
    if (filtro === 'Todos') return pedidos
    return pedidos.filter((p) => p.estado === filtro)
  }, [pedidos, filtro])

  const contadores = useMemo(() => {
    const c: Record<string, number> = { Todos: pedidos.length }
    for (const e of ESTADOS_PEDIDO) {
      c[e] = pedidos.filter((p) => p.estado === e).length
    }
    // Include legacy 'Cancelado'
    c['Cancelado'] = pedidos.filter((p) => p.estado === 'Cancelado').length
    return c
  }, [pedidos])

  async function crearClienteAutomatico(data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!user || !data.cliente_nombre) return
    const yaExiste = clientes.some(
      (c) => c.nombre.toLowerCase() === data.cliente_nombre.toLowerCase()
    )
    if (yaExiste) return
    try {
      await agregarCliente({
        userId: user.uid,
        nombre: data.cliente_nombre,
        telefono: data.cliente_telefono,
        email: data.cliente_email,
      })
    } catch {
      // Non-critical
    }
  }

  async function handleAgregar(data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    await agregarPedido({ ...data, userId: user.uid })
    await crearClienteAutomatico(data)
    setModalForm(false)
    setPrefill(null)
  }

  async function handleEditar(data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    if (!pedidoEditar?.id) return
    await actualizarPedido(pedidoEditar.id, data)
    setPedidoEditar(null)
  }

  function cerrarModal() {
    setModalForm(false)
    setPedidoEditar(null)
    setPrefill(null)
  }

  async function handleCambiarEstado(pedidoId: string, nuevoEstado: EstadoPedido, pedido: Pedido) {
    setCambiandoEstado(pedidoId)
    try {
      await cambiarEstado(pedidoId, nuevoEstado, pedido)
    } finally {
      setCambiandoEstado(null)
    }
  }

  function infoFilamentos(pedido: Pedido): string {
    const fils = normalizarFilamentos(pedido)
    if (fils.length === 0) return 'Sin material'
    return fils.map((f) => {
      const m = materiales.find((mat) => mat.id === f.materialId)
      const nombre = m ? nombreCortoMaterial(m) : 'Material'
      return `${nombre} (${f.consumo_gramos}g/ud)`
    }).join(' · ')
  }

  function detalleStockDescontado(pedido: Pedido): string {
    const cant = pedido.cantidad ?? 1
    const fils = normalizarFilamentos(pedido)
    const partes = fils.map((f) => {
      const m = materiales.find((mat) => mat.id === f.materialId)
      return `${m ? nombreCortoMaterial(m) : 'Material'}: ${f.consumo_gramos * cant}g`
    })
    if (pedido.insumos) {
      for (const ins of pedido.insumos) {
        const m = materiales.find((mat) => mat.id === ins.materialId)
        partes.push(`${m ? m.nombre : 'Insumo'}: ${ins.cantidad * cant} ud`)
      }
    }
    return partes.join(', ')
  }

  function calcularFinanciero(pedido: Pedido): { costoTotal: number; ganancia: number; margen: number } | null {
    if (!pedido.precio_acordado || pedido.precio_acordado <= 0) return null
    const cant = pedido.cantidad ?? 1
    const prod = productos.find((p) => p.id === pedido.productoId)
    let costoTotal: number | null = null
    if (prod?.costo_total) {
      costoTotal = prod.costo_total * cant
    } else {
      const fils = normalizarFilamentos(pedido)
      const costoPorUd = fils.reduce((sum, f) => {
        const m = materiales.find((mat) => mat.id === f.materialId)
        if (!m) return sum
        return sum + (m.precio_por_kilo / 1000) * f.consumo_gramos
      }, 0)
      if (costoPorUd > 0) costoTotal = costoPorUd * cant
    }
    if (costoTotal === null) return null
    const ganancia = pedido.precio_acordado - costoTotal
    const margen = (ganancia / pedido.precio_acordado) * 100
    return { costoTotal, ganancia, margen }
  }

  const isLoading = loadingPed || loadingMat || loadingProd

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
        <div className="flex items-center gap-2 flex-shrink-0">
          {pedidos.length > 0 && (
            <button
              onClick={() => exportarCSVPedidos(pedidos)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              title="Exportar como CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              CSV
            </button>
          )}
          <button
            onClick={() => setModalForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo pedido
          </button>
        </div>
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
            <button onClick={() => setModalForm(true)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Crear el primer pedido
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => {
            const fils = normalizarFilamentos(pedido)
            const consumoTotal = totalConsumo(pedido)
            const financiero = calcularFinanciero(pedido)
            const prod = productos.find((p) => p.id === pedido.productoId)
            const disponibles = estadosDisponibles(pedido.estado)
            const terminal = esTerminal(pedido.estado)
            return (
              <div key={pedido.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Info principal */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-900">{pedido.cliente_nombre}</h3>
                        {pedido.cliente_telefono && (
                          <span className="text-xs text-slate-400">{pedido.cliente_telefono}</span>
                        )}
                        {pedido.cliente_email && (
                          <span className="text-xs text-slate-400">{pedido.cliente_email}</span>
                        )}
                        <EstadoBadge estado={pedido.estado} />
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{pedido.descripcion}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        <span>Cantidad: <span className="font-medium text-slate-600">{pedido.cantidad}</span> ud</span>
                        {fils.length > 0 && (
                          <span>Filamento: <span className="font-medium text-slate-600">
                            {fils.length === 1 ? infoFilamentos(pedido) : `${consumoTotal}g/ud (${fils.length} mat.)`}
                          </span></span>
                        )}
                        <span>Entrega: <span className="font-medium text-slate-600">{pedido.fecha_entrega}</span></span>
                        {prod && <span>Producto: <span className="font-medium text-indigo-600">{prod.nombre}</span></span>}
                      </div>

                      {/* Insumos */}
                      {pedido.insumos && pedido.insumos.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {pedido.insumos.map((ins, i) => {
                            const m = materiales.find((mat) => mat.id === ins.materialId)
                            return (
                              <span key={`ins-${i}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                📦 {m ? m.nombre : 'Insumo'} ×{ins.cantidad * (pedido.cantidad ?? 1)}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {pedido.notas && (
                        <p className="mt-1.5 text-xs text-slate-400 italic">{pedido.notas}</p>
                      )}

                      {/* Desglose financiero */}
                      {financiero !== null && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-center">
                            <p className="text-slate-400 mb-0.5">Costo total</p>
                            <p className="font-semibold text-slate-700 tabular-nums">{ars(financiero.costoTotal)}</p>
                            {(pedido.cantidad ?? 1) > 1 && prod?.costo_total && (
                              <p className="text-slate-400 text-xs">{ars(prod.costo_total)}/ud</p>
                            )}
                          </div>
                          <div className="bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-2 text-center">
                            <p className="text-sky-500 mb-0.5">Precio de venta</p>
                            <p className="font-semibold text-sky-700 tabular-nums">{ars(pedido.precio_acordado!)}</p>
                            {(pedido.cantidad ?? 1) > 1 && (
                              <p className="text-sky-400 text-xs">{ars(pedido.precio_acordado! / (pedido.cantidad ?? 1))}/ud</p>
                            )}
                          </div>
                          <div className={`rounded-lg px-2.5 py-2 text-center border ${
                            financiero.ganancia >= 0
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <p className={`mb-0.5 ${financiero.ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Ganancia</p>
                            <p className={`font-bold tabular-nums ${financiero.ganancia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {financiero.ganancia >= 0 ? '' : '−'}{ars(Math.abs(financiero.ganancia))}
                            </p>
                            <p className={`text-xs ${financiero.ganancia >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                              {financiero.margen.toFixed(1)}% del precio
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                      {!terminal && (
                        <button
                          onClick={() => setPedidoEditar(pedido)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          aria-label={`Editar pedido de ${pedido.cliente_nombre}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                          Editar
                        </button>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                        {terminal ? (
                          <EstadoBadge estado={pedido.estado} />
                        ) : (
                          <>
                            <select
                              value={pedido.estado}
                              disabled={cambiandoEstado === pedido.id}
                              onChange={(e) => handleCambiarEstado(pedido.id!, e.target.value as EstadoPedido, pedido)}
                              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-60 cursor-pointer"
                            >
                              {disponibles.map((e) => (
                                <option key={e} value={e}>{e}</option>
                              ))}
                            </select>
                            {cambiandoEstado === pedido.id && (
                              <p className="text-xs text-slate-400 mt-1 text-center">Actualizando...</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aviso stock descontado */}
                  {pedido.estado === 'Completado' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Stock descontado — {detalleStockDescontado(pedido)}
                    </div>
                  )}
                  {(pedido.estado === 'Cancelado - POS') && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                      Cancelado post-producción — materiales ya consumidos
                    </div>
                  )}
                  {(pedido.estado === 'Cancelado - PRE') && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                      </svg>
                      Cancelado pre-producción — stock restaurado si venía de Completado
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo / editar pedido */}
      {(modalForm || pedidoEditar !== null) && (
        <FormPedido
          productos={productos}
          materiales={materiales}
          inicial={pedidoEditar ?? prefill ?? undefined}
          onGuardar={pedidoEditar ? handleEditar : handleAgregar}
          onCancelar={cerrarModal}
        />
      )}
    </div>
  )
}
