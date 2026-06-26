'use client'

import { useState } from 'react'
import type { Material, TipoMaterial, UnidadMaterial } from '@/lib/types'
import { TIPOS_FILAMENTO, TIPOS_INSUMO } from '@/lib/types'

interface FormMaterialProps {
  inicial?: Partial<Material>
  onGuardar: (data: Omit<Material, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  onCancelar: () => void
}

const VACIO_FILAMENTO: Omit<Material, 'id' | 'userId' | 'createdAt'> = {
  nombre: '',
  tipo: 'PLA',
  color: '',
  marca: '',
  stock_gramos: 0,
  precio_por_kilo: 0,
  proveedor: '',
  punto_reposicion: 200,
  unidad: 'g',
}

const VACIO_INSUMO: Omit<Material, 'id' | 'userId' | 'createdAt'> = {
  nombre: '',
  tipo: 'Bolsa',
  color: '',
  marca: '',
  stock_gramos: 0,
  precio_por_kilo: 0,
  proveedor: '',
  punto_reposicion: 10,
  unidad: 'ud',
}

export default function FormMaterial({ inicial = {}, onGuardar, onCancelar }: FormMaterialProps) {
  const unidadInicial: UnidadMaterial = (inicial.unidad ?? 'g')
  const [unidad, setUnidad] = useState<UnidadMaterial>(unidadInicial)
  const base = unidad === 'g' ? VACIO_FILAMENTO : VACIO_INSUMO
  const [form, setForm] = useState({ ...base, ...inicial, unidad: unidadInicial })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleUnidadChange(nuevaUnidad: UnidadMaterial) {
    setUnidad(nuevaUnidad)
    const defaultTipo = nuevaUnidad === 'g' ? 'PLA' : 'Bolsa'
    setForm((prev) => ({
      ...prev,
      unidad: nuevaUnidad,
      tipo: (inicial.tipo ?? defaultTipo) as TipoMaterial,
      punto_reposicion: nuevaUnidad === 'g' ? 200 : 10,
    }))
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
        marca: form.marca?.trim() || undefined,
        stock_gramos: Number(form.stock_gramos),
        precio_por_kilo: Number(form.precio_por_kilo),
        proveedor: form.proveedor.trim(),
        punto_reposicion: Number(form.punto_reposicion),
        unidad,
      })
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const esEdicion = !!inicial.nombre
  const tiposDisponibles = unidad === 'g' ? TIPOS_FILAMENTO : TIPOS_INSUMO

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {esEdicion ? 'Editar material' : 'Nuevo material'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Toggle Filamento / Insumo */}
          {!esEdicion && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">¿Qué tipo de material es?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUnidadChange('g')}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                    unidad === 'g'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold">🧵 Filamento</div>
                  <div className="text-xs mt-0.5 opacity-70">Se mide en gramos (PLA, PETG, etc.)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleUnidadChange('ud')}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                    unidad === 'ud'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold">📦 Insumo / Terminación</div>
                  <div className="text-xs mt-0.5 opacity-70">Se mide en unidades (bolsas, cajas, etc.)</div>
                </button>
              </div>
            </div>
          )}

          {esEdicion && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              unidad === 'g' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {unidad === 'g' ? '🧵 Filamento (gramos)' : '📦 Insumo / Terminación (unidades)'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <input
                required
                type="text"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: PLA Blanco Premium' : 'Ej: Bolsa zip 20×30, Llavero acr. dorado'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoMaterial)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {tiposDisponibles.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {unidad === 'g' ? 'Color' : 'Variante / Color'} <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: Blanco' : 'Ej: Transparente, 10mm'}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Marca / Origen <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                type="text"
                value={form.marca ?? ''}
                onChange={(e) => set('marca', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: Bambu Lab, Printalt, eSUN...' : 'Ej: Packing AR, local de Once...'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {unidad === 'g' ? 'Stock (gramos) *' : 'Stock (unidades) *'}
              </label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.stock_gramos}
                onChange={(e) => set('stock_gramos', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: 1000' : 'Ej: 100'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {unidad === 'g' ? 'Punto de reposición (g) *' : 'Avisar cuando queden *'}
              </label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.punto_reposicion}
                onChange={(e) => set('punto_reposicion', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: 200' : 'Ej: 5 unidades'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {unidad === 'g' ? 'Precio por kilo ($ ARS/kg) *' : 'Precio por unidad ($ ARS/ud) *'}
              </label>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.precio_por_kilo}
                onChange={(e) => set('precio_por_kilo', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={unidad === 'g' ? 'Ej: 12000' : 'Ej: 500'}
              />
              {unidad === 'g' && (
                <p className="text-xs text-slate-400 mt-1">
                  Precio completo del kilo. Ej: si un carrete de 1kg cuesta $12.000, ingresá 12000.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                type="text"
                value={form.proveedor}
                onChange={(e) => set('proveedor', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: MercadoLibre, local Once..."
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
