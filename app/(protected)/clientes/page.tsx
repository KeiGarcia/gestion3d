'use client'

import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useClientes } from '@/hooks/useClientes'
import { usePedidos } from '@/hooks/usePedidos'
import FormCliente from '@/components/FormCliente'
import ConfirmModal from '@/components/ConfirmModal'
import type { Cliente } from '@/lib/types'
import { ars } from '@/lib/format'

type Modal = { tipo: 'agregar' } | { tipo: 'editar'; cliente: Cliente } | { tipo: 'eliminar'; cliente: Cliente } | null

export default function ClientesPage() {
  const { user } = useAuthContext()
  const { clientes, loading, agregarCliente, actualizarCliente, eliminarCliente } = useClientes(user?.uid)
  const { pedidos, loading: loadingPed } = usePedidos(user?.uid)
  const [modal, setModal] = useState<Modal>(null)
  const [eliminando, setEliminando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const clientesFiltrados = clientes.filter((c) =>
    !busqueda ||
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  function pedidosDeCliente(nombre: string) {
    return pedidos.filter((p) => p.cliente_nombre.toLowerCase() === nombre.toLowerCase())
  }

  async function handleGuardar(data: Omit<Cliente, 'id' | 'userId' | 'createdAt'>) {
    if (!user) return
    if (modal?.tipo === 'editar' && modal.cliente.id) {
      await actualizarCliente(modal.cliente.id, data)
    } else {
      await agregarCliente({ ...data, userId: user.uid })
    }
    setModal(null)
  }

  async function handleEliminar() {
    if (modal?.tipo !== 'eliminar' || !modal.cliente.id) return
    setEliminando(true)
    try {
      await eliminarCliente(modal.cliente.id)
      setModal(null)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'agregar' })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-32 animate-pulse">
              <div className="bg-slate-200 h-4 w-32 rounded mb-3" />
              <div className="bg-slate-200 h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
          <p className="text-slate-500 text-sm">
            {busqueda ? `Sin clientes que coincidan con "${busqueda}"` : 'Sin clientes registrados'}
          </p>
          {!busqueda && (
            <button onClick={() => setModal({ tipo: 'agregar' })} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Agregar el primer cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => {
            const susPedidos = pedidosDeCliente(c.nombre)
            const totalFacturado = susPedidos.reduce((s, p) => s + (p.precio_acordado ?? 0), 0)
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{c.nombre}</h3>
                    {c.email && <p className="text-xs text-slate-400 truncate mt-0.5">{c.email}</p>}
                    {c.telefono && (
                      <a href={`tel:${c.telefono}`} className="text-xs text-indigo-600 hover:underline mt-0.5 block">
                        {c.telefono}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setModal({ tipo: 'editar', cliente: c })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      aria-label={`Editar ${c.nombre}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setModal({ tipo: 'eliminar', cliente: c })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Eliminar ${c.nombre}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 flex items-center gap-4 text-xs text-slate-500">
                  {loadingPed ? (
                    <span className="text-slate-300">Cargando pedidos...</span>
                  ) : (
                    <>
                      <span>{susPedidos.length} pedido{susPedidos.length !== 1 ? 's' : ''}</span>
                      {totalFacturado > 0 && (
                        <span className="font-semibold text-emerald-600">{ars(totalFacturado)} facturado</span>
                      )}
                    </>
                  )}
                </div>
                {c.notas && <p className="text-xs text-slate-400 mt-2 italic">{c.notas}</p>}
              </div>
            )
          })}
        </div>
      )}

      {modal?.tipo === 'agregar' && (
        <FormCliente onGuardar={handleGuardar} onCancelar={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && (
        <FormCliente inicial={modal.cliente} onGuardar={handleGuardar} onCancelar={() => setModal(null)} />
      )}
      {modal?.tipo === 'eliminar' && (
        <ConfirmModal
          titulo="Eliminar cliente"
          mensaje={`¿Estás seguro de que querés eliminar a "${modal.cliente.nombre}"?`}
          onConfirmar={handleEliminar}
          onCancelar={() => setModal(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}
