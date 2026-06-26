'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { useMateriales } from '@/hooks/useMateriales'
import { useConfiguracion } from '@/hooks/useConfiguracion'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ResultadoCalculo, InsumoUsado } from '@/lib/types'
import { labelMaterial, esFilamento } from '@/lib/types'
import { ars } from '@/lib/format'

interface ModalGuardarProducto {
  nombre: string
  precio_venta: string
}

interface FilamentoCalc {
  materialId: string
  consumo_gramos: number
}

const FILAMENTO_VACIO: FilamentoCalc = { materialId: '', consumo_gramos: 0 }
const INSUMO_CALC_VACIO: InsumoUsado = { materialId: '', cantidad: 1 }

interface CostosCalc {
  costo_energia: number | string
  costo_amortizacion: number | string
  costo_mano_obra: number | string
  costo_packaging: number | string
  margen: number | string
}

export default function CalculadoraPage() {
  const { user } = useAuthContext()
  const { materiales: todosMateriales } = useMateriales(user?.uid)
  const { config, loading: loadingConfig, guardarConfig } = useConfiguracion(user?.uid)
  const router = useRouter()

  const materiales = todosMateriales.filter(esFilamento)
  const insumosDisp = todosMateriales.filter((m) => !esFilamento(m))

  const [filamentos, setFilamentos] = useState<FilamentoCalc[]>([{ ...FILAMENTO_VACIO }])
  const [insumosCalc, setInsumosCalc] = useState<InsumoUsado[]>([])
  const [tiempo_horas, setTiempoHoras] = useState(0)
  const [costos, setCostos] = useState<CostosCalc>({
    costo_energia: config.costo_energia_hora,
    costo_amortizacion: config.costo_amortizacion_hora,
    costo_mano_obra: config.costo_mano_obra_hora,
    costo_packaging: config.costo_packaging_default,
    margen: config.margen_ganancia_default,
  })
  const [editandoConfig, setEditandoConfig] = useState(false)
  const [modalProducto, setModalProducto] = useState<ModalGuardarProducto | null>(null)
  const [guardandoProducto, setGuardandoProducto] = useState(false)

  useEffect(() => {
    if (!loadingConfig) {
      setCostos({
        costo_energia: config.costo_energia_hora,
        costo_amortizacion: config.costo_amortizacion_hora,
        costo_mano_obra: config.costo_mano_obra_hora,
        costo_packaging: config.costo_packaging_default,
        margen: config.margen_ganancia_default,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConfig])

  function setCosto<K extends keyof CostosCalc>(key: K, value: number | string) {
    setCostos((prev) => ({ ...prev, [key]: value }))
  }

  function setFilamento(idx: number, field: keyof FilamentoCalc, value: string | number) {
    setFilamentos((prev) => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f))
  }

  function addFilamento() {
    if (filamentos.length < 4) setFilamentos((prev) => [...prev, { ...FILAMENTO_VACIO }])
  }

  function removeFilamento(idx: number) {
    if (filamentos.length > 1) setFilamentos((prev) => prev.filter((_, i) => i !== idx))
  }

  function setInsumoCalc(idx: number, field: keyof InsumoUsado, value: string | number) {
    setInsumosCalc((prev) => prev.map((i, n) => n === idx ? { ...i, [field]: value } : i))
  }
  function addInsumoCalc() {
    setInsumosCalc((prev) => [...prev, { ...INSUMO_CALC_VACIO }])
  }
  function removeInsumoCalc(idx: number) {
    setInsumosCalc((prev) => prev.filter((_, i) => i !== idx))
  }

  const filamentosValidos = filamentos.filter((f) => f.materialId && Number(f.consumo_gramos) > 0)
  const insumosValidos = insumosCalc.filter((i) => i.materialId && Number(i.cantidad) > 0)

  const resultado: ResultadoCalculo | null = useMemo(() => {
    if (filamentosValidos.length === 0 && insumosValidos.length === 0) return null

    const margenDecimal = Number(costos.margen) / 100
    if (margenDecimal >= 1 || margenDecimal < 0) return null

    const costo_filamento = filamentosValidos.reduce((sum, f) => {
      const mat = materiales.find((m) => m.id === f.materialId)
      if (!mat) return sum
      return sum + (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos)
    }, 0)

    const costo_insumos = insumosValidos.reduce((sum, i) => {
      const mat = insumosDisp.find((m) => m.id === i.materialId)
      if (!mat) return sum
      return sum + mat.precio_por_kilo * Number(i.cantidad)
    }, 0)

    const costo_energia = Number(tiempo_horas) * Number(costos.costo_energia)
    const costo_amortizacion = Number(tiempo_horas) * Number(costos.costo_amortizacion)
    const costo_mano_obra = Number(tiempo_horas) * Number(costos.costo_mano_obra)
    const costo_packaging = Number(costos.costo_packaging)
    const costo_total = costo_filamento + costo_insumos + costo_energia + costo_amortizacion + costo_mano_obra + costo_packaging

    // Margen sobre precio final: precio = costo / (1 - margen)
    const precio_sugerido = costo_total / (1 - margenDecimal)
    const ganancia = precio_sugerido - costo_total

    return { costo_filamento, costo_insumos, costo_energia, costo_amortizacion, costo_mano_obra, costo_packaging, costo_total, precio_sugerido, ganancia }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filamentos, insumosCalc, tiempo_horas, costos, materiales, insumosDisp])

  function abrirModalProducto() {
    if (!resultado) return
    setModalProducto({
      nombre: '',
      precio_venta: Math.round(resultado.precio_sugerido).toString(),
    })
  }

  async function handleGuardarProducto() {
    if (!resultado || !user || !modalProducto) return
    const precioVenta = Number(modalProducto.precio_venta)
    if (!modalProducto.nombre.trim() || isNaN(precioVenta) || precioVenta <= 0) return
    setGuardandoProducto(true)
    try {
      const costoTotal = resultado.costo_total
      const margenReal = costoTotal > 0 ? ((precioVenta - costoTotal) / precioVenta) * 100 : 0
      await addDoc(collection(db, 'productos'), {
        userId: user.uid,
        nombre: modalProducto.nombre.trim(),
        filamentos: filamentosValidos,
        insumos: insumosValidos.length > 0 ? insumosValidos : [],
        tiempo_horas: Number(tiempo_horas),
        costo_total: costoTotal,
        precio_venta: precioVenta,
        precio_sugerido: resultado.precio_sugerido,
        margen_real: margenReal,
        createdAt: serverTimestamp(),
      })
      setModalProducto(null)
      router.push('/productos')
    } finally {
      setGuardandoProducto(false)
    }
  }

  async function handleGuardarConfig() {
    await guardarConfig({
      costo_energia_hora: Number(costos.costo_energia),
      costo_amortizacion_hora: Number(costos.costo_amortizacion),
      costo_mano_obra_hora: Number(costos.costo_mano_obra),
      margen_ganancia_default: Number(costos.margen),
      costo_packaging_default: Number(costos.costo_packaging),
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
          <p className="text-sm text-slate-500 mt-0.5">Calculá el costo real y el precio de venta sugerido</p>
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
          <h3 className="text-sm font-semibold text-indigo-900 mb-1">Valores por defecto</h3>
          <p className="text-xs text-indigo-600 mb-4">Estos valores se guardan y se usan como base en futuros cálculos</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'costo_energia' as const, label: 'Energía ($/h)', hint: 'Costo eléctrico por hora de impresión' },
              { key: 'costo_amortizacion' as const, label: 'Amortización ($/h)', hint: 'Desgaste del equipo por hora' },
              { key: 'costo_mano_obra' as const, label: 'Mano de obra ($/h)', hint: 'Tu valor hora de trabajo' },
              { key: 'costo_packaging' as const, label: 'Packaging ($ por pedido)', hint: 'Caja, burbuja, cinta, etc.' },
              { key: 'margen' as const, label: 'Margen de ganancia (%)', hint: '% sobre el precio final de venta' },
            ].map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-indigo-800 mb-0.5">{label}</label>
                <p className="text-xs text-indigo-500 mb-1">{hint}</p>
                <input
                  type="number"
                  min={0}
                  max={key === 'margen' ? 99 : undefined}
                  step={key === 'margen' ? 1 : 1}
                  value={costos[key]}
                  onChange={(e) => setCosto(key, e.target.value)}
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

          {/* Filamentos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">🧵 Filamentos</p>
              <span className="text-xs text-slate-400 tabular-nums">{filamentos.length}/4</span>
            </div>

            {materiales.length === 0 && insumosDisp.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Primero registrá materiales en el módulo de Materiales.
              </p>
            ) : materiales.length === 0 ? (
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Sin filamentos. Podés calcular solo con insumos.
              </p>
            ) : (
              <div className="space-y-2">
                {filamentos.map((f, idx) => {
                  const mat = materiales.find((m) => m.id === f.materialId)
                  const subtotal = mat && Number(f.consumo_gramos) > 0
                    ? (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos)
                    : null
                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Filamento {idx + 1}
                              </label>
                              <select
                                value={f.materialId}
                                onChange={(e) => setFilamento(idx, 'materialId', e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              >
                                <option value="">Seleccionar...</option>
                                {materiales.map((m) => (
                                  <option key={m.id} value={m.id}>{labelMaterial(m)}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24 flex-shrink-0">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Consumo (g)</label>
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={f.consumo_gramos}
                                onChange={(e) => setFilamento(idx, 'consumo_gramos', e.target.value)}
                                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          {mat && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500">Stock: {mat.stock_gramos.toLocaleString('es-AR')} g</span>
                              {subtotal !== null && (
                                <span className="font-semibold text-indigo-600">{ars(subtotal, true)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {filamentos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFilamento(idx)}
                            className="mt-5 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                            aria-label={`Eliminar filamento ${idx + 1}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {filamentos.length < 4 && (
                  <button
                    type="button"
                    onClick={addFilamento}
                    className="w-full py-2.5 text-sm font-medium text-indigo-600 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Agregar filamento
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Insumos / Terminación */}
          {insumosDisp.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">📦 Insumos / Terminación</p>
                <span className="text-xs text-slate-400">Opcional</span>
              </div>
              <div className="space-y-2">
                {insumosCalc.map((ins, idx) => {
                  const mat = insumosDisp.find((m) => m.id === ins.materialId)
                  const subtotal = mat && Number(ins.cantidad) > 0 ? mat.precio_por_kilo * Number(ins.cantidad) : null
                  return (
                    <div key={idx} className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Insumo {idx + 1}</label>
                              <select value={ins.materialId}
                                onChange={(e) => setInsumoCalc(idx, 'materialId', e.target.value)}
                                className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                                <option value="">Seleccionar...</option>
                                {insumosDisp.map((m) => (
                                  <option key={m.id} value={m.id}>{labelMaterial(m)}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24 flex-shrink-0">
                              <label className="block text-xs font-medium text-slate-600 mb-1">Cant. (ud)</label>
                              <input type="number" min={1} step={1} value={ins.cantidad}
                                onChange={(e) => setInsumoCalc(idx, 'cantidad', e.target.value)}
                                className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                          </div>
                          {mat && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-500">Stock: {mat.stock_gramos.toLocaleString('es-AR')} ud</span>
                              {subtotal !== null && (
                                <span className="font-semibold text-amber-700">{ars(subtotal, true)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => removeInsumoCalc(idx)}
                          className="mt-5 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                          aria-label={`Eliminar insumo ${idx + 1}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
                <button type="button" onClick={addInsumoCalc}
                  className="w-full py-2.5 text-sm font-medium text-amber-700 border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-2 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Agregar insumo
                </button>
              </div>
            </div>
          )}

          {/* Tiempo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de impresión (h)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={tiempo_horas}
              onChange={(e) => setTiempoHoras(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Costos configurables */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Costos operativos</p>
            <div className="space-y-3">
              {[
                { key: 'costo_energia' as const, label: 'Costo energético ($/h)' },
                { key: 'costo_amortizacion' as const, label: 'Amortización equipo ($/h)' },
                { key: 'costo_mano_obra' as const, label: 'Mano de obra ($/h)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 flex-1">{label}</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={costos[key]}
                    onChange={(e) => setCosto(key, e.target.value)}
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                  />
                </div>
              ))}

              {/* Packaging */}
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                <div className="flex-1">
                  <label className="text-sm text-slate-600">Packaging ($ por pedido)</label>
                  <p className="text-xs text-slate-400">Caja, papel burbuja, cinta, etc.</p>
                </div>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={costos.costo_packaging}
                  onChange={(e) => setCosto('costo_packaging', e.target.value)}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                />
              </div>

              {/* Margen */}
              <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                <div className="flex-1">
                  <label className="text-sm text-slate-600">Margen de ganancia (%)</label>
                  <p className="text-xs text-slate-400">Calculado sobre el precio final de venta</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  value={costos.margen}
                  onChange={(e) => setCosto('margen', e.target.value)}
                  className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
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
            <div className="space-y-2">
              {/* Filamentos individuales */}
              {filamentosValidos.map((f, idx) => {
                const mat = materiales.find((m) => m.id === f.materialId)
                const costo = mat ? (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos) : 0
                const nombre = mat ? [mat.marca, mat.tipo, mat.color].filter(Boolean).join(' ') : 'Material'
                return (
                  <div key={idx} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100">
                    <div>
                      <p className="text-sm text-slate-700">{nombre}</p>
                      <p className="text-xs text-slate-400">
                        {f.consumo_gramos}g × {ars(mat ? mat.precio_por_kilo / 1000 : 0, true)}/g
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-800 tabular-nums">{ars(costo, true)}</span>
                  </div>
                )
              })}

              {/* Insumos individuales */}
              {insumosValidos.map((ins, idx) => {
                const mat = insumosDisp.find((m) => m.id === ins.materialId)
                const costo = mat ? mat.precio_por_kilo * Number(ins.cantidad) : 0
                const nombre = mat ? [mat.marca, mat.nombre].filter(Boolean).join(' ') : 'Insumo'
                return (
                  <div key={`ins-${idx}`} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100">
                    <div>
                      <p className="text-sm text-slate-700">{nombre}</p>
                      <p className="text-xs text-slate-400">
                        {ins.cantidad} ud × {ars(mat?.precio_por_kilo ?? 0)}/ud
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-800 tabular-nums">{ars(costo, true)}</span>
                  </div>
                )
              })}

              {/* Costos por hora */}
              {[
                { label: 'Costo energía', valor: resultado.costo_energia, detalle: `${tiempo_horas}h × ${ars(Number(costos.costo_energia))}/h` },
                { label: 'Amortización equipo', valor: resultado.costo_amortizacion, detalle: `${tiempo_horas}h × ${ars(Number(costos.costo_amortizacion))}/h` },
                { label: 'Mano de obra', valor: resultado.costo_mano_obra, detalle: `${tiempo_horas}h × ${ars(Number(costos.costo_mano_obra))}/h` },
              ].map(({ label, valor, detalle }) => (
                <div key={label} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{detalle}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-800 tabular-nums">{ars(valor, true)}</span>
                </div>
              ))}

              {/* Packaging */}
              <div className="flex items-start justify-between gap-2 py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm text-slate-700">Packaging</p>
                  <p className="text-xs text-slate-400">Caja, burbuja, cinta</p>
                </div>
                <span className="text-sm font-medium text-slate-800 tabular-nums">{ars(resultado.costo_packaging, true)}</span>
              </div>

              {/* Resumen final */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Costo total</span>
                  <span className="text-base font-semibold text-slate-900 tabular-nums">{ars(resultado.costo_total)}</span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-start">
                  <div>
                    <span className="text-base font-bold text-indigo-700">Precio de venta sugerido</span>
                    <p className="text-xs text-indigo-500 mt-0.5">Margen {Number(costos.margen)}% sobre precio final</p>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600 tabular-nums">{ars(resultado.precio_sugerido)}</span>
                </div>

                <div className="border-t border-emerald-200 pt-3 flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2 -mx-0">
                  <div>
                    <span className="text-sm font-bold text-emerald-800">Tu ganancia</span>
                    <p className="text-xs text-emerald-600 mt-0.5">{Number(costos.margen)}% del precio final</p>
                  </div>
                  <span className="text-xl font-bold text-emerald-700 tabular-nums">{ars(resultado.ganancia)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={abrirModalProducto}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                  </svg>
                  Guardar como producto
                </button>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Guardar como producto */}
      {modalProducto && resultado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalProducto(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Guardar como producto</h2>
              <button onClick={() => setModalProducto(null)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del producto *</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={modalProducto.nombre}
                  onChange={(e) => setModalProducto((p) => p ? { ...p, nombre: e.target.value } : p)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Maceta hexagonal, Llavero personalizado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio de venta ($ ARS)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={modalProducto.precio_venta}
                  onChange={(e) => setModalProducto((p) => p ? { ...p, precio_venta: e.target.value } : p)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Sugerido por la calculadora: {ars(resultado.precio_sugerido)}
                </p>
              </div>

              {/* Margen en tiempo real */}
              {(() => {
                const pv = Number(modalProducto.precio_venta)
                const ct = resultado.costo_total
                const margen = pv > 0 && ct >= 0 ? ((pv - ct) / pv) * 100 : null
                return margen !== null ? (
                  <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-sm ${
                    margen >= 30 ? 'bg-emerald-50 text-emerald-800' :
                    margen >= 10 ? 'bg-amber-50 text-amber-800' :
                    'bg-red-50 text-red-800'
                  }`}>
                    <span className="font-medium">Margen de ganancia</span>
                    <span className="font-bold">{margen.toFixed(1)}% sobre precio final</span>
                  </div>
                ) : null
              })()}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModalProducto(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarProducto}
                  disabled={guardandoProducto || !modalProducto.nombre.trim() || Number(modalProducto.precio_venta) <= 0}
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg"
                >
                  {guardandoProducto ? 'Guardando...' : 'Guardar producto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
