'use client'

import { useState } from 'react'
import type { Pedido, Material } from '@/lib/types'
import { ESTADOS_PEDIDO } from '@/lib/types'

interface FormPedidoProps {
  materiales: Material[]
  onGuardar: (data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancelar: () => void
}

const hoy = new Date().toISOString().split('T')[0]

export default function FormPedido({ materiales, onGuardar, onCancelar }: FormPedidoProps) {
  const [form, setForm] = useState({
    cliente_nombre: '',
    descripcion: '',
    cantidad: 1,
    materialId: materiales[0]?.id ?? '',
    consumo_gramos: 0,
    fecha_entrega: hoy,
    estado: 'Pendiente' as Pedido['estado'],
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.materialId) {
      setError('Selecciona un material')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        ...form,
        cliente_nombre: form.cliente_nombre.trim(),
        descripcion: form.descripcion.trim(),
        cantidad: Number(form.cantidad),
        consumo_gramos: Number(form.consumo_gramos),
      })
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nuevo pedido</h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
            <input
              required
              type="text"
              value={form.cliente_nombre}
              onChange={(e) => set('cliente_nombre', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción del producto *</label>
            <textarea
              required
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Ej: Porta objetos con tapa, diseño personalizado"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad *</label>
              <input
                required
                type="number"
                min={1}
                value={form.cantidad}
                onChange={(e) => set('cantidad', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => set('estado', e.target.value as Pedido['estado'])}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ESTADOS_PEDIDO.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material *</label>
              <select
                required
                value={form.materialId}
                onChange={(e) => set('materialId', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.tipo})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consumo estimado (g) *</label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.consumo_gramos}
                onChange={(e) => set('consumo_gramos', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de entrega estimada *</label>
              <input
                required
                type="date"
                value={form.fecha_entrega}
                min={hoy}
                onChange={(e) => set('fecha_entrega', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancelar} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg"
            >
              {guardando ? 'Guardando...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
