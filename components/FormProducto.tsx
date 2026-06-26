'use client'

import { useState, useMemo } from 'react'
import type { Producto, Material, Configuracion, InsumoUsado, FilamentoPedido } from '@/lib/types'
import { labelMaterial, esFilamento } from '@/lib/types'
import { ars } from '@/lib/format'

type ConfigBasica = Omit<Configuracion, 'id' | 'userId'>

interface FormProductoProps {
  inicial?: Partial<Producto>
  materiales: Material[]
  config: ConfigBasica
  onGuardar: (data: Omit<Producto, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  onCancelar: () => void
}

const FIL_VACIO: FilamentoPedido = { materialId: '', consumo_gramos: 0 }
const INS_VACIO: InsumoUsado = { materialId: '', cantidad: 1 }

interface CostosForm {
  energia: number | string
  amortizacion: number | string
  mano_obra: number | string
  packaging: number | string
  margen: number | string
}

export default function FormProducto({ inicial, materiales, config, onGuardar, onCancelar }: FormProductoProps) {
  const filamentosDisp = materiales.filter(esFilamento)
  const insumosDisp = materiales.filter((m) => !esFilamento(m))

  // Nombre / desc / notas
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [notas, setNotas] = useState(inicial?.notas ?? '')

  // Receta
  const [filamentos, setFilamentos] = useState<FilamentoPedido[]>(
    inicial?.filamentos?.length ? inicial.filamentos : [{ ...FIL_VACIO }]
  )
  const [insumosCalc, setInsumosCalc] = useState<InsumoUsado[]>(inicial?.insumos ?? [])
  const [tiempoHoras, setTiempoHoras] = useState<number | string>(
    inicial?.tiempo_horas ?? inicial?.tiempo_horas_estimado ?? 0
  )

  // Costos operativos (usa config como default, pero editable)
  const [costos, setCostos] = useState<CostosForm>({
    energia:      config.costo_energia_hora,
    amortizacion: config.costo_amortizacion_hora,
    mano_obra:    config.costo_mano_obra_hora,
    packaging:    config.costo_packaging_default,
    margen:       config.margen_ganancia_default,
  })

  // precio_venta editable; null = sigue al precio sugerido automáticamente
  const [precioVentaManual, setPrecioVentaManual] = useState<string>(
    (inicial?.precio_venta ?? inicial?.precio_sugerido)?.toString() ?? ''
  )
  const [precioEditado, setPrecioEditado] = useState(
    !!(inicial?.precio_venta ?? inicial?.precio_sugerido)
  )

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Cálculo en tiempo real ──────────────────────────────────────────
  const filamentosValidos = filamentos.filter((f) => f.materialId && Number(f.consumo_gramos) > 0)
  const insumosValidos = insumosCalc.filter((i) => i.materialId && Number(i.cantidad) > 0)

  const resultado = useMemo(() => {
    const margenDecimal = Number(costos.margen) / 100
    if (margenDecimal >= 1 || margenDecimal < 0) return null

    const costo_filamento = filamentosValidos.reduce((sum, f) => {
      const mat = filamentosDisp.find((m) => m.id === f.materialId)
      if (!mat) return sum
      return sum + (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos)
    }, 0)

    const costo_insumos = insumosValidos.reduce((sum, i) => {
      const mat = insumosDisp.find((m) => m.id === i.materialId)
      if (!mat) return sum
      return sum + mat.precio_por_kilo * Number(i.cantidad)
    }, 0)

    const h = Number(tiempoHoras)
    const costo_energia      = h * Number(costos.energia)
    const costo_amortizacion = h * Number(costos.amortizacion)
    const costo_mano_obra    = h * Number(costos.mano_obra)
    const costo_packaging    = Number(costos.packaging)
    const costo_total = costo_filamento + costo_insumos + costo_energia + costo_amortizacion + costo_mano_obra + costo_packaging

    if (costo_total <= 0 && filamentosValidos.length === 0 && insumosValidos.length === 0) return null

    const precio_sugerido = margenDecimal < 1 ? costo_total / (1 - margenDecimal) : costo_total
    const ganancia = precio_sugerido - costo_total

    return { costo_filamento, costo_insumos, costo_energia, costo_amortizacion, costo_mano_obra, costo_packaging, costo_total, precio_sugerido, ganancia }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filamentos, insumosCalc, tiempoHoras, costos, materiales])

  // Auto-actualizar precio si el usuario no lo modificó manualmente
  const precioSugerido = resultado?.precio_sugerido ?? 0
  const precioVenta = precioEditado ? Number(precioVentaManual) : precioSugerido
  const costoTotal = resultado?.costo_total ?? 0
  const margenReal = precioVenta > 0 ? ((precioVenta - costoTotal) / precioVenta) * 100 : 0

  function handlePrecioVentaChange(v: string) {
    setPrecioVentaManual(v)
    setPrecioEditado(true)
  }

  // ── Filamentos ──────────────────────────────────────────────────────
  function setFilamento(idx: number, field: keyof FilamentoPedido, value: string | number) {
    setFilamentos((prev) => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f))
  }
  function addFilamento() {
    if (filamentos.length < 4) setFilamentos((prev) => [...prev, { ...FIL_VACIO }])
  }
  function removeFilamento(idx: number) {
    if (filamentos.length > 1) setFilamentos((prev) => prev.filter((_, i) => i !== idx))
  }

  // ── Insumos ─────────────────────────────────────────────────────────
  function setInsumo(idx: number, field: keyof InsumoUsado, value: string | number) {
    setInsumosCalc((prev) => prev.map((i, n) => n === idx ? { ...i, [field]: value } : i))
  }
  function addInsumo() { setInsumosCalc((prev) => [...prev, { ...INS_VACIO }]) }
  function removeInsumo(idx: number) { setInsumosCalc((prev) => prev.filter((_, i) => i !== idx)) }

  // ── Submit ──────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        filamentos: filamentosValidos.length > 0 ? filamentosValidos : undefined,
        insumos: insumosValidos.length > 0 ? insumosValidos : undefined,
        tiempo_horas: Number(tiempoHoras) || undefined,
        costo_total: resultado?.costo_total,
        precio_sugerido: resultado?.precio_sugerido,
        precio_venta: precioVenta > 0 ? precioVenta : undefined,
        margen_real: precioVenta > 0 ? margenReal : undefined,
        notas: notas.trim() || undefined,
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header fijo */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial?.nombre ? `Editar — ${inicial.nombre}` : 'Nuevo producto'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Nombre + Descripción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del producto *</label>
              <input required type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Maceta hexagonal, Llavero personalizado" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Dimensiones, variantes, color..." />
            </div>
          </div>

          {/* Calculadora embebida */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Columna izquierda: inputs ── */}
            <div className="space-y-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Receta de producción</p>

              {/* Filamentos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">🧵 Filamentos</p>
                  <span className="text-xs text-slate-400">{filamentos.length}/4</span>
                </div>
                {filamentosDisp.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Sin filamentos registrados en Materiales.
                  </p>
                ) : (
                  <>
                    {filamentos.map((f, idx) => {
                      const mat = filamentosDisp.find((m) => m.id === f.materialId)
                      const sub = mat && Number(f.consumo_gramos) > 0
                        ? (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos) : null
                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex gap-2">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex gap-2">
                                <select value={f.materialId}
                                  onChange={(e) => setFilamento(idx, 'materialId', e.target.value)}
                                  className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                                  <option value="">Seleccionar...</option>
                                  {filamentosDisp.map((m) => <option key={m.id} value={m.id}>{labelMaterial(m)}</option>)}
                                </select>
                                <div className="w-24 flex-shrink-0">
                                  <input type="number" min={0} step={1} placeholder="g"
                                    value={f.consumo_gramos}
                                    onChange={(e) => setFilamento(idx, 'consumo_gramos', e.target.value)}
                                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                              </div>
                              {mat && (
                                <div className="flex gap-3 text-xs text-slate-400">
                                  <span>Stock: {mat.stock_gramos.toLocaleString('es-AR')}g</span>
                                  {sub !== null && <span className="font-semibold text-indigo-600">{ars(sub, true)}</span>}
                                </div>
                              )}
                            </div>
                            {filamentos.length > 1 && (
                              <button type="button" onClick={() => removeFilamento(idx)}
                                className="mt-1 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {filamentos.length < 4 && (
                      <button type="button" onClick={addFilamento}
                        className="w-full py-2 text-xs font-medium text-indigo-600 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl">
                        + Agregar filamento
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Insumos */}
              {insumosDisp.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">📦 Insumos / Terminación</p>
                  {insumosCalc.map((ins, idx) => {
                    const mat = insumosDisp.find((m) => m.id === ins.materialId)
                    const sub = mat && Number(ins.cantidad) > 0 ? mat.precio_por_kilo * Number(ins.cantidad) : null
                    return (
                      <div key={idx} className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex gap-2">
                              <select value={ins.materialId}
                                onChange={(e) => setInsumo(idx, 'materialId', e.target.value)}
                                className="flex-1 px-2.5 py-2 border border-amber-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white">
                                <option value="">Seleccionar...</option>
                                {insumosDisp.map((m) => <option key={m.id} value={m.id}>{labelMaterial(m)}</option>)}
                              </select>
                              <div className="w-20 flex-shrink-0">
                                <input type="number" min={1} step={1} placeholder="ud"
                                  value={ins.cantidad}
                                  onChange={(e) => setInsumo(idx, 'cantidad', e.target.value)}
                                  className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500" />
                              </div>
                            </div>
                            {mat && (
                              <div className="flex gap-3 text-xs text-slate-400">
                                <span>Stock: {mat.stock_gramos.toLocaleString('es-AR')} ud</span>
                                {sub !== null && <span className="font-semibold text-amber-700">{ars(sub, true)}</span>}
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => removeInsumo(idx)}
                            className="mt-1 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <button type="button" onClick={addInsumo}
                    className="w-full py-2 text-xs font-medium text-amber-700 border-2 border-dashed border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl">
                    + Agregar insumo
                  </button>
                </div>
              )}

              {/* Tiempo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tiempo de impresión (h)</label>
                <input type="number" min={0} step={0.5} value={tiempoHoras}
                  onChange={(e) => setTiempoHoras(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Costos operativos */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Costos operativos</p>
                {([
                  { key: 'energia' as const,      label: 'Energía ($/h)' },
                  { key: 'amortizacion' as const,  label: 'Amortización ($/h)' },
                  { key: 'mano_obra' as const,     label: 'Mano de obra ($/h)' },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs text-slate-600 flex-1">{label}</label>
                    <input type="number" min={0} step={1} value={costos[key]}
                      onChange={(e) => setCostos((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right" />
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <label className="text-xs text-slate-600 flex-1">Packaging ($ por unidad)</label>
                  <input type="number" min={0} step={100} value={costos.packaging}
                    onChange={(e) => setCostos((p) => ({ ...p, packaging: e.target.value }))}
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right" />
                </div>
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <div className="flex-1">
                    <label className="text-xs text-slate-600">Margen de ganancia (%)</label>
                    <p className="text-xs text-slate-400">Sobre precio final de venta</p>
                  </div>
                  <input type="number" min={0} max={99} step={1} value={costos.margen}
                    onChange={(e) => setCostos((p) => ({ ...p, margen: e.target.value }))}
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right" />
                </div>
              </div>
            </div>

            {/* ── Columna derecha: resultado ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desglose de costos</p>

              {!resultado ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm gap-2 bg-slate-50 rounded-xl border border-slate-200">
                  <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm2.498-2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm2.248-2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008ZM8.25 6h7.5v4.5h-7.5V6ZM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Z" />
                  </svg>
                  <p className="text-xs">Completá la receta para ver el cálculo</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-1.5">
                  {/* Filamentos */}
                  {filamentosValidos.map((f, i) => {
                    const mat = filamentosDisp.find((m) => m.id === f.materialId)
                    const costo = mat ? (mat.precio_por_kilo / 1000) * Number(f.consumo_gramos) : 0
                    return (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-200">
                        <span className="text-slate-600">{mat ? [mat.marca, mat.tipo, mat.color].filter(Boolean).join(' ') : 'Material'} · {f.consumo_gramos}g</span>
                        <span className="font-medium tabular-nums">{ars(costo, true)}</span>
                      </div>
                    )
                  })}
                  {/* Insumos */}
                  {insumosValidos.map((ins, i) => {
                    const mat = insumosDisp.find((m) => m.id === ins.materialId)
                    const costo = mat ? mat.precio_por_kilo * Number(ins.cantidad) : 0
                    return (
                      <div key={`ins-${i}`} className="flex justify-between text-xs py-1 border-b border-slate-200">
                        <span className="text-slate-600">{mat?.nombre ?? 'Insumo'} × {ins.cantidad}</span>
                        <span className="font-medium tabular-nums">{ars(costo, true)}</span>
                      </div>
                    )
                  })}
                  {/* Costos por hora */}
                  {Number(tiempoHoras) > 0 && ([
                    { label: 'Energía',       valor: resultado.costo_energia },
                    { label: 'Amortización',  valor: resultado.costo_amortizacion },
                    { label: 'Mano de obra',  valor: resultado.costo_mano_obra },
                  ].map(({ label, valor }) => (
                    <div key={label} className="flex justify-between text-xs py-1 border-b border-slate-200">
                      <span className="text-slate-600">{label} · {tiempoHoras}h</span>
                      <span className="font-medium tabular-nums">{ars(valor, true)}</span>
                    </div>
                  )))}
                  {/* Packaging */}
                  <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                    <span className="text-slate-600">Packaging</span>
                    <span className="font-medium tabular-nums">{ars(resultado.costo_packaging, true)}</span>
                  </div>

                  {/* Costo total */}
                  <div className="flex justify-between pt-2">
                    <span className="text-sm text-slate-700 font-medium">Costo total</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{ars(resultado.costo_total)}</span>
                  </div>

                  {/* Precio sugerido */}
                  <div className="flex justify-between items-start pt-1">
                    <div>
                      <span className="text-sm font-bold text-indigo-700">Precio sugerido</span>
                      <p className="text-xs text-indigo-400">Con {Number(costos.margen)}% de margen</p>
                    </div>
                    <span className="text-xl font-bold text-indigo-600 tabular-nums">{ars(resultado.precio_sugerido)}</span>
                  </div>

                  {/* Ganancia */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex justify-between items-center mt-1">
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Tu ganancia</p>
                      <p className="text-xs text-emerald-600">{Number(costos.margen)}% del precio final</p>
                    </div>
                    <span className="text-lg font-bold text-emerald-700 tabular-nums">{ars(resultado.ganancia)}</span>
                  </div>
                </div>
              )}

              {/* Precio de venta editable */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">Precio de venta final ($ ARS) <span className="text-slate-400 font-normal text-xs">(opcional)</span></label>
                  <p className="text-xs text-slate-400 mb-2">
                    {precioEditado ? 'Modificado manualmente' : 'Siguiendo precio sugerido — podés ajustarlo'}
                  </p>
                  <div className="flex gap-2">
                    <input type="number" min={0} step={1}
                      value={precioEditado ? precioVentaManual : Math.round(precioSugerido).toString()}
                      onChange={(e) => handlePrecioVentaChange(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Precio de venta" />
                    {precioEditado && (
                      <button type="button"
                        onClick={() => { setPrecioEditado(false); setPrecioVentaManual('') }}
                        className="px-3 py-2 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg">
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Margen real sobre precio venta */}
                {precioVenta > 0 && resultado && (
                  <div className={`rounded-lg px-3 py-2 flex items-center justify-between text-sm ${
                    margenReal >= 30 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    margenReal >= 10 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <span className="text-xs">Margen real</span>
                    <div className="text-right">
                      <span className="font-bold">{margenReal.toFixed(1)}% sobre precio final</span>
                      <p className="text-xs opacity-80">Ganancia: {ars(precioVenta - costoTotal)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas de impresión <span className="text-slate-400 font-normal">(opcional)</span></label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Configuración de slicer, relleno, soportes..." />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button type="button" onClick={onCancelar}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg">
              {guardando ? 'Guardando...' : (inicial?.nombre ? 'Guardar cambios' : 'Agregar producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
