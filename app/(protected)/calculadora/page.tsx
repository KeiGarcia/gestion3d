'use client'

import { useState, useMemo, useEffect } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useMateriales } from '@/hooks/useMateriales'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ResultadoCalculo } from '@/lib/types'

export default function CalculadoraPage() {
  const { user } = useAuthContext()
  const { materiales } = useMateriales(user?.uid)
  const { config, loading: loadingConfig, guardarConfig } = useConfiguracion(user?.uid)

  const [form, setForm] = useState({
    materialId: '',
    consumo_gramos: 0,
    tiempo_horas: 0,
    costo_energia: config.costo_energia_hora,
    costo_amortizacion: config.costo_amortizacion_hora,
    costo_mano_obra: config.costo_mano_obra_hora,
    margen: config.margen_ganancia_default,
  })

  // Sync form with config once loaded from Firestore
  useEffect(() => {
    if (!loadingConfig) {
      setForm((prev) => ({
        ...prev,
        costo_energia: config.costo_energia_hora,
        costo_amortizacion: config.costo_amortizacion_hora,
        costo_mano_obra: config.costo_mano_obra_hora,
        margen: config.margen_ganancia_default,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConfig])

  const [guardandoRef, setGuardandoRef] = useState(false)
  const [refGuardada, setRefGuardada] = useState(false)
  const [editandoConfig, setEditandoConfig] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: number | string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const materialSeleccionado = materiales.find((m) => m.id === form.materialId)

  const resultado: ResultadoCalculo | null = useMemo(() => {
    if (!materialSeleccionado || form.consumo_gramos <= 0) return null

    const costo_filamento = (materialSeleccionado.precio_por_kilo / 1000) * Number(form.consumo_gramos)
    const costo_energia = Number(form.tiempo_horas) * Number(form.costo_energia)
    const costo_amortizacion = Number(form.tiempo_horas) * Number(form.costo_amortizacion)
    const costo_mano_obra = Number(form.tiempo_horas) * Number(form.costo_mano_obra)
    const costo_total = costo_filamento + costo_energia + costo_amortizacion + costo_mano_obra
    const precio_sugerido = costo_total * (1 + Number(form.margen) / 100)

    return { costo_filamento, costo_energia, costo_amortizacion, costo_mano_obra, costo_total, precio_sugerido }
  }, [materialSeleccionado, form])

  async function handleGuardarReferencia() {
    if (!resultado || !user) return
    setGuardandoRef(true)
    try {
      await addDoc(collection(db, 'referencias_calculo'), {
        userId: user.uid,
        materialId: form.materialId,
        materialNombre: materialSeleccionado?.nombre ?? '',
        consumo_gramos: Number(form.consumo_gramos),
        tiempo_horas: Number(form.tiempo_horas),
        ...resultado,
        margen: Number(form.margen),
        createdAt: serverTimestamp(),
      })
      setRefGuardada(true)
      setTimeout(() => setRefGuardada(false), 3000)
    } finally {
      setGuardandoRef(false)
    }
  }

  async function handleGuardarConfig() {
    await guardarConfig({
      costo_energia_hora: Number(form.costo_energia),
      costo_amortizacion_hora: Number(form.costo_amortizacion),
      costo_mano_obra_hora: Number(form.costo_mano_obra),
      margen_ganancia_default: Number(form.margen),
    })
    setEditandoConfig(false)
  }

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-48">
        <svg className="animate-spin w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calculadora de Costos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Calculá el costo y precio sugerido de tus impresiones</p>
        </div>
        <button
          onClick={() => setEditandoConfig(!editandoConfig)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          Configuración
        </button>
      </div>

      {/* Panel de configuración */}
      {editandoConfig && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-indigo-900 mb-4">Valores por defecto</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'costo_energia', label: 'Costo energía ($/h)' },
              { key: 'costo_amortizacion', label: 'Amortización ($/h)' },
              { key: 'costo_mano_obra', label: 'Mano de obra ($/h)' },
              { key: 'margen', label: 'Margen de ganancia (%)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-indigo-800 mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => set(key as keyof typeof form, e.target.value)}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setEditandoConfig(false)} className="px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 rounded-lg">
              Cancelar
            </button>
            <button onClick={handleGuardarConfig} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Guardar configuración
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-700">Datos del trabajo</h2>

          {/* Material */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Material *</label>
            <select
              value={form.materialId}
              onChange={(e) => set('materialId', e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Seleccionar material...</option>
              {materiales.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} — ${m.precio_por_kilo.toFixed(2)}/kg
                </option>
              ))}
            </select>
            {materialSeleccionado && (
              <p className="text-xs text-slate-400 mt-1">
                Stock disponible: {materialSeleccionado.stock_gramos.toLocaleString()} g
              </p>
            )}
          </div>

          {/* Consumo y tiempo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Consumo de filamento (g)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.consumo_gramos}
                onChange={(e) => set('consumo_gramos', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de impresión (h)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.tiempo_horas}
                onChange={(e) => set('tiempo_horas', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Costos configurables */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Costos operativos</p>
            <div className="space-y-3">
              {[
                { key: 'costo_energia', label: 'Costo energético ($/h)' },
                { key: 'costo_amortizacion', label: 'Amortización equipo ($/h)' },
                { key: 'costo_mano_obra', label: 'Mano de obra ($/h)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 flex-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => set(key as keyof typeof form, e.target.value)}
                    className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-600 flex-1">Margen de ganancia (%)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={1}
                  value={form.margen}
                  onChange={(e) => set('margen', e.target.value)}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Desglose de costos</h2>

          {!resultado ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm2.498-2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm2.248-2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v4.5h-7.5V6ZM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" />
              </svg>
              <p>Completá el formulario para ver el cálculo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desglose */}
              {[
                { label: 'Costo filamento', valor: resultado.costo_filamento, detalle: `${form.consumo_gramos}g × $${(materialSeleccionado!.precio_por_kilo / 1000).toFixed(4)}/g` },
                { label: 'Costo energía', valor: resultado.costo_energia, detalle: `${form.tiempo_horas}h × $${form.costo_energia}/h` },
                { label: 'Amortización equipo', valor: resultado.costo_amortizacion, detalle: `${form.tiempo_horas}h × $${form.costo_amortizacion}/h` },
                { label: 'Mano de obra', valor: resultado.costo_mano_obra, detalle: `${form.tiempo_horas}h × $${form.costo_mano_obra}/h` },
              ].map(({ label, valor, detalle }) => (
                <div key={label} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{detalle}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-800 tabular-nums">${valor.toFixed(4)}</span>
                </div>
              ))}

              {/* Total */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700">Costo total</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">${resultado.costo_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-indigo-700">Precio sugerido ({form.margen}% margen)</span>
                  <span className="text-2xl font-bold text-indigo-600 tabular-nums">${resultado.precio_sugerido.toFixed(2)}</span>
                </div>
              </div>

              {/* Guardar referencia */}
              <button
                onClick={handleGuardarReferencia}
                disabled={guardandoRef}
                className="w-full py-2.5 text-sm font-medium text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {refGuardada ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    ¡Referencia guardada!
                  </>
                ) : guardandoRef ? 'Guardando...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                    Guardar como referencia
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
