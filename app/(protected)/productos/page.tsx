'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { useProductos } from '@/hooks/useProductos'
import { useMateriales } from '@/hooks/useMateriales'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import FormProducto from '@/components/FormProducto'
import ConfirmModal from '@/components/ConfirmModal'
import type { Producto } from '@/lib/types'
import { ars } from '@/lib/format'

type Modal = { tipo: 'agregar' } | { tipo: 'editar'; producto: Producto } | { tipo: 'eliminar'; producto: Producto } | null

export default function ProductosPage() {
  const { user } = useAuthContext()
  const { productos, loading, agregarProducto, actualizarProducto, eliminarProducto } = useProductos(user?.uid)
  const { materiales } = useMateriales(user?.uid)
  const { config } = useConfiguracion(user?.uid)
  const [modal, setModal] = useState<Modal>(null)
  const [eliminando, setEliminando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const router = useRouter()

  const productosFiltrados = productos.filter((p) =>
    !busqueda ||
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function handleGuardar(data: Omit<Producto, 'id' | 'userId' | 'createdAt'>) {
    if (!user) return
    if (modal?.tipo === 'editar' && modal.producto.id) {
      await actualizarProducto(modal.producto.id, data)
    } else {
      await agregarProducto({ ...data, userId: user.uid })
    }
    setModal(null)
  }

  async function handleEliminar() {
    if (modal?.tipo !== 'eliminar' || !modal.producto.id) return
    setEliminando(true)
    try {
      await eliminarProducto(modal.producto.id)
      setModal(null)
    } finally {
      setEliminando(false)
    }
  }

  function handleCrearPedido(p: Producto) {
    sessionStorage.setItem('prod_prefill', JSON.stringify({ productoId: p.id }))
    router.push('/pedidos')
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catálogo de Productos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {productos.length} producto{productos.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'agregar' })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo producto
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
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-36 animate-pulse">
              <div className="bg-slate-200 h-4 w-40 rounded mb-3" />
              <div className="bg-slate-200 h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          <p className="text-slate-500 text-sm">
            {busqueda ? `Sin productos que coincidan con "${busqueda}"` : 'Sin productos en el catálogo'}
          </p>
          {!busqueda && (
            <button onClick={() => setModal({ tipo: 'agregar' })} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Agregar el primer producto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{p.nombre}</h3>
                  {p.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.descripcion}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setModal({ tipo: 'editar', producto: p })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    aria-label={`Editar ${p.nombre}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setModal({ tipo: 'eliminar', producto: p })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    aria-label={`Eliminar ${p.nombre}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {(p.tiempo_horas ?? p.tiempo_horas_estimado) != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    {(p.tiempo_horas ?? p.tiempo_horas_estimado)}h
                  </span>
                )}
                {p.costo_total != null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    Costo: {ars(p.costo_total)}
                  </span>
                )}
                {(p.precio_venta ?? p.precio_sugerido) != null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    {ars(p.precio_venta ?? p.precio_sugerido ?? 0)}
                  </span>
                )}
                {p.margen_real != null && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.margen_real >= 30 ? 'bg-emerald-50 text-emerald-700' :
                    p.margen_real >= 10 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {p.margen_real.toFixed(1)}% margen
                  </span>
                )}
              </div>

              {p.notas && <p className="text-xs text-slate-400 italic">{p.notas}</p>}

              <button
                onClick={() => handleCrearPedido(p)}
                className="mt-auto w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Crear pedido
              </button>
            </div>
          ))}
        </div>
      )}

      {modal?.tipo === 'agregar' && (
        <FormProducto materiales={materiales} config={config} onGuardar={handleGuardar} onCancelar={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && (
        <FormProducto inicial={modal.producto} materiales={materiales} config={config} onGuardar={handleGuardar} onCancelar={() => setModal(null)} />
      )}
      {modal?.tipo === 'eliminar' && (
        <ConfirmModal
          titulo="Eliminar producto"
          mensaje={`¿Estás seguro de que querés eliminar "${modal.producto.nombre}" del catálogo?`}
          onConfirmar={handleEliminar}
          onCancelar={() => setModal(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}
