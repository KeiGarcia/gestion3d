'use client'

import { useState, useEffect, useMemo } from 'react'
import type { Pedido, Producto, Material, Cliente } from '@/lib/types'
import { ars } from '@/lib/format'

interface FormPedidoProps {
  productos: Producto[]
  materiales: Material[]
  clientes: Cliente[]
  inicial?: Partial<Pedido> & { productoId?: string }
  onGuardar: (data: Omit<Pedido, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancelar: () => void
}

export default function FormPedido({ productos, materiales, clientes, inicial, onGuardar, onCancelar }: FormPedidoProps) {
  const hoy = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [productoId, setProductoId] = useState(inicial?.productoId ?? '')
  const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1)

  // Cliente
  const [clienteId, setClienteId] = useState<string>('')   // '' = nuevo cliente
  const [clienteNombre, setClienteNombre] = useState(inicial?.cliente_nombre ?? '')
  const [clienteTelefono, setClienteTelefono] = useState(inicial?.cliente_telefono ?? '')
  const [clienteEmail, setClienteEmail] = useState(inicial?.cliente_email ?? '')

  const [fechaEntrega, setFechaEntrega] = useState(inicial?.fecha_entrega ?? hoy)
  const [notas, setNotas] = useState(inicial?.notas ?? '')
  const [precioAcordado, setPrecioAcordado] = useState(inicial?.precio_acordado?.toString() ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const producto = productos.find((p) => p.id === productoId) ?? null

  // Cuando se selecciona un cliente existente, auto-rellenar los campos
  function handleSelectCliente(id: string) {
    setClienteId(id)
    if (id === '') {
      // "Nuevo cliente" seleccionado: limpiar campos para escribir
      setClienteNombre('')
      setClienteTelefono('')
      setClienteEmail('')
      return
    }
    const c = clientes.find((x) => x.id === id)
    if (c) {
      setClienteNombre(c.nombre)
      setClienteTelefono(c.telefono ?? '')
      setClienteEmail(c.email ?? '')
    }
  }

  // Auto-fill precio cuando cambia producto o cantidad (solo pedidos nuevos)
  useEffect(() => {
    if (!inicial?.precio_acordado && producto) {
      const pv = producto.precio_venta ?? producto.precio_sugerido
      if (pv) setPrecioAcordado(Math.round(pv * Number(cantidad)).toString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, cantidad])

  function nombreCortoMaterial(materialId: string): string {
    const m = materiales.find((x) => x.id === materialId)
    if (!m) return 'Material'
    return [m.marca, m.tipo, m.color].filter(Boolean).join(' ')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const esLegacy = !productoId && !!inicial?.descripcion
    if (!productoId && !esLegacy) { setError('Seleccioná un producto'); return }
    if (!clienteNombre.trim()) { setError('El nombre del cliente es obligatorio'); return }
    setGuardando(true)
    setError(null)
    try {
      await onGuardar({
        productoId: productoId || undefined,
        cliente_nombre: clienteNombre.trim(),
        cliente_telefono: clienteTelefono.trim() || undefined,
        cliente_email: clienteEmail.trim() || undefined,
        descripcion: producto?.nombre ?? inicial?.descripcion ?? '',
        cantidad: Number(cantidad),
        materiales: producto?.filamentos ?? inicial?.materiales ?? [],
        insumos: producto?.insumos && producto.insumos.length > 0 ? producto.insumos : inicial?.insumos,
        fecha_entrega: fechaEntrega,
        estado: (inicial?.estado ?? 'Pendiente') as Pedido['estado'],
        precio_acordado: precioAcordado !== '' ? Number(precioAcordado) : undefined,
        notas: notas.trim() || undefined,
      })
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  const precioTotal = producto
    ? ((producto.precio_venta ?? producto.precio_sugerido ?? 0) * Number(cantidad))
    : null
  const costoTotal = producto?.costo_total ? producto.costo_total * Number(cantidad) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {inicial?.cliente_nombre ? 'Editar pedido' : 'Nuevo pedido'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="Cerrar">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Producto + Cantidad */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Producto</p>
            {productos.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No hay productos en el catálogo. Calculá un producto primero desde la Calculadora.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Producto *</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Seleccioná un producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}{(p.precio_venta ?? p.precio_sugerido) ? ` — ${ars(p.precio_venta ?? p.precio_sugerido ?? 0)}/ud` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {producto && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700">{producto.nombre}</p>
                    {producto.descripcion && <p className="text-xs text-indigo-600">{producto.descripcion}</p>}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {producto.costo_total && (
                        <span className="bg-white border border-indigo-200 rounded px-2 py-0.5 text-slate-600">
                          Costo: {ars(producto.costo_total)}/ud
                        </span>
                      )}
                      {(producto.precio_venta ?? producto.precio_sugerido) && (
                        <span className="bg-white border border-indigo-200 rounded px-2 py-0.5 text-emerald-700 font-semibold">
                          Precio: {ars(producto.precio_venta ?? producto.precio_sugerido ?? 0)}/ud
                        </span>
                      )}
                      {producto.margen_real && (
                        <span className="bg-white border border-indigo-200 rounded px-2 py-0.5 text-indigo-600">
                          Margen: {producto.margen_real.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {(producto.filamentos?.length || producto.insumos?.length) ? (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-indigo-200">
                        {producto.filamentos?.map((f, i) => (
                          <span key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                            🧵 {nombreCortoMaterial(f.materialId)} {f.consumo_gramos}g/ud
                          </span>
                        ))}
                        {producto.insumos?.map((ins, i) => (
                          <span key={`ins-${i}`} className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                            📦 {nombreCortoMaterial(ins.materialId)} ×{ins.cantidad}/ud
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad de unidades *</label>
                    <input
                      required
                      type="number"
                      min={1}
                      step={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio acordado ($ ARS) <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={precioAcordado}
                      onChange={(e) => setPrecioAcordado(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Automático"
                    />
                  </div>
                </div>

                {producto && Number(cantidad) > 1 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex flex-wrap gap-4 text-xs">
                    {costoTotal !== null && (
                      <span className="text-slate-600">Costo total: <span className="font-semibold text-slate-800">{ars(costoTotal)}</span></span>
                    )}
                    {precioTotal !== null && (
                      <span className="text-slate-600">Precio total: <span className="font-semibold text-emerald-700">{ars(precioTotal)}</span></span>
                    )}
                    {producto.filamentos && producto.filamentos.length > 0 && (
                      <span className="text-slate-500">
                        Filamento total: {producto.filamentos.reduce((s, f) => s + f.consumo_gramos * Number(cantidad), 0)}g
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</p>

            {/* Selector de cliente existente */}
            {clientes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Buscar cliente existente <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={clienteId}
                  onChange={(e) => handleSelectCliente(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Nuevo cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}{c.telefono ? ` · ${c.telefono}` : ''}
                    </option>
                  ))}
                </select>
                {clienteId && (
                  <p className="text-xs text-indigo-600 mt-1">
                    Datos pre-cargados. Podés editarlos si cambiaron.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  required
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre completo del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+54 9 11..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="cliente@mail.com"
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {clienteId
                ? 'El pedido se asociará al cliente seleccionado.'
                : 'Si es un cliente nuevo, se agregará automáticamente a tu lista.'}
            </p>
          </div>

          {/* Entrega */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Entrega</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha estimada *</label>
              <input
                required
                type="date"
                value={fechaEntrega}
                min={inicial?.fecha_entrega ? undefined : hoy}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notas internas <span className="text-slate-400 font-normal">(opcional)</span></label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Observaciones, instrucciones especiales..."
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
              disabled={guardando || productos.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg"
            >
              {guardando ? 'Guardando...' : (inicial?.cliente_nombre ? 'Guardar cambios' : 'Crear pedido')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
