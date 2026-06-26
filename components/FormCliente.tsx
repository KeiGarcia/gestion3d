'use client'

import { useState } from 'react'
import type { Cliente } from '@/lib/types'

interface FormClienteProps {
  inicial?: Partial<Cliente>
  onGuardar: (data: Omit<Cliente, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  onCancelar: () => void
}

export default function FormCliente({ inicial, onGuardar, onCancelar }: FormClienteProps) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre ?? '',
    telefono: inicial?.telefono ?? '',
    email: inicial?.email ?? '',
    notas: inicial?.notas ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        notas: form.notas.trim() || undefined,
      })
    } catch {
      setError('Error al guardar. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial?.nombre ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nombre o razón social"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+54 9 11..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              value={form.notas}
              onChange={(e) => set('notas', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Preferencias, dirección, etc."
            />
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
              {guardando ? 'Guardando...' : (inicial?.nombre ? 'Guardar cambios' : 'Agregar cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
