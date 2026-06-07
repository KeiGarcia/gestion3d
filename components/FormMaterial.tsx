'use client'

import { useState } from 'react'
import type { Material, TipoMaterial } from '@/lib/types'
import { TIPOS_MATERIAL } from '@/lib/types'

interface FormMaterialProps {
  inicial?: Partial<Material>
  onGuardar: (data: Omit<Material, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  onCancelar: () => void
}

const VACIO: Omit<Material, 'id' | 'userId' | 'createdAt'> = {
  nombre: '',
  tipo: 'PLA',
  color: '',
  stock_gramos: 0,
  precio_por_kilo: 0,
  proveedor: '',
  punto_reposicion: 200,
}

export default function FormMaterial({ inicial = {}, onGuardar, onCancelar }: FormMaterialProps) {
  const [form, setForm] = useState({ ...VACIO, ...inicial })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        color: form.color.trim(),
        stock_gramos: Number(form.stock_gramos),
        precio_por_kilo: Number(form.precio_por_kilo),
        proveedor: form.proveedor.trim(),
        punto_reposicion: Number(form.punto_reposicion),
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
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial.nombre ? 'Editar material' : 'Nuevo material'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                required
                type="text"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: PLA Blanco Premium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo *</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoMaterial)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {TIPOS_MATERIAL.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Blanco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock (gramos) *</label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.stock_gramos}
                onChange={(e) => set('stock_gramos', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Punto de reposición (g) *</label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.punto_reposicion}
                onChange={(e) => set('punto_reposicion', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio por kilo (USD) *</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={form.precio_por_kilo}
                onChange={(e) => set('precio_por_kilo', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
              <input
                type="text"
                value={form.proveedor}
                onChange={(e) => set('proveedor', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Fillamentum"
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
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
