'use client'

import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useMateriales } from '@/hooks/useMateriales'
import TablaMateriales from '@/components/TablaMateriales'
import FormMaterial from '@/components/FormMaterial'
import ConfirmModal from '@/components/ConfirmModal'
import type { Material } from '@/lib/types'

type Modal = { tipo: 'agregar' } | { tipo: 'editar'; material: Material } | { tipo: 'eliminar'; material: Material } | null

export default function MaterialesPage() {
  const { user } = useAuthContext()
  const { materiales, loading, agregarMaterial, actualizarMaterial, eliminarMaterial } = useMateriales(user?.uid)
  const [modal, setModal] = useState<Modal>(null)
  const [eliminando, setEliminando] = useState(false)

  async function handleGuardar(data: Omit<Material, 'id' | 'userId' | 'createdAt'>) {
    if (!user) return
    if (modal?.tipo === 'editar' && modal.material.id) {
      await actualizarMaterial(modal.material.id, data)
    } else {
      await agregarMaterial({ ...data, userId: user.uid })
    }
    setModal(null)
  }

  async function handleEliminar() {
    if (modal?.tipo !== 'eliminar' || !modal.material.id) return
    setEliminando(true)
    try {
      await eliminarMaterial(modal.material.id)
      setModal(null)
    } finally {
      setEliminando(false)
    }
  }

  const materialesCriticos = materiales.filter((m) => m.stock_gramos < m.punto_reposicion)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Materiales e Insumos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {materiales.length} material{materiales.length !== 1 ? 'es' : ''} registrado{materiales.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'agregar' })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo material
        </button>
      </div>

      {/* Alerta stock crítico */}
      {materialesCriticos.length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-700">
              {materialesCriticos.length} material{materialesCriticos.length !== 1 ? 'es' : ''} con stock crítico
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {materialesCriticos.map((m) => m.nombre).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <TablaMateriales
            materiales={materiales}
            onEditar={(m) => setModal({ tipo: 'editar', material: m })}
            onEliminar={(m) => setModal({ tipo: 'eliminar', material: m })}
          />
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Stock OK (≥ 1.5× punto reposición)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />Stock bajo (entre punto reposición y 1.5×)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Stock crítico (por debajo del punto de reposición)</span>
      </div>

      {/* Modales */}
      {(modal?.tipo === 'agregar') && (
        <FormMaterial onGuardar={handleGuardar} onCancelar={() => setModal(null)} />
      )}
      {modal?.tipo === 'editar' && (
        <FormMaterial
          inicial={modal.material}
          onGuardar={handleGuardar}
          onCancelar={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'eliminar' && (
        <ConfirmModal
          titulo="Eliminar material"
          mensaje={`¿Estás seguro de que querés eliminar "${modal.material.nombre}"? Esta acción no se puede deshacer.`}
          onConfirmar={handleEliminar}
          onCancelar={() => setModal(null)}
          cargando={eliminando}
        />
      )}
    </div>
  )
}
