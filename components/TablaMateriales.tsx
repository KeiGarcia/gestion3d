'use client'

import { useState } from 'react'
import type { Material } from '@/lib/types'
import { ars } from '@/lib/format'

interface Props {
  materiales: Material[]
  onEditar: (material: Material) => void
  onEliminar: (material: Material) => void
}

type SortKey = 'nombre' | 'tipo' | 'stock_gramos' | 'precio_por_kilo'
type SortDir = 'asc' | 'desc'

function indicadorStock(stock: number, punto: number) {
  if (stock <= 0 || stock < punto) return { color: 'bg-red-500', texto: 'Crítico', clase: 'text-red-700 bg-red-50' }
  if (stock < punto * 1.5) return { color: 'bg-amber-500', texto: 'Bajo', clase: 'text-amber-700 bg-amber-50' }
  return { color: 'bg-emerald-500', texto: 'OK', clase: 'text-emerald-700 bg-emerald-50' }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg className={`w-3 h-3 ml-1 inline-block ${active ? 'text-indigo-600' : 'text-slate-300'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      {dir === 'asc' || !active
        ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      }
    </svg>
  )
}

export default function TablaMateriales({ materiales, onEditar, onEliminar }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('nombre')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...materiales].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir
    return ((va as number) - (vb as number)) * dir
  })

  if (materiales.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
        </svg>
        <p className="text-sm">Sin materiales registrados</p>
        <p className="text-xs mt-1">Agrega tu primer material con el botón de arriba</p>
      </div>
    )
  }

  function ThSortable({ colKey, label, align = 'left' }: { colKey: SortKey; label: string; align?: 'left' | 'right' }) {
    const isActive = sortKey === colKey
    return (
      <th
        className={`py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide cursor-pointer select-none hover:text-slate-900 text-${align}`}
        onClick={() => handleSort(colKey)}
      >
        {label}
        <SortIcon active={isActive} dir={isActive ? sortDir : 'asc'} />
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <ThSortable colKey="nombre" label="Material" />
            <ThSortable colKey="tipo" label="Tipo" />
            <ThSortable colKey="stock_gramos" label="Stock" align="right" />
            <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Rep.</th>
            <ThSortable colKey="precio_por_kilo" label="Precio" align="right" />
            <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Estado</th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((m) => {
            const indicador = indicadorStock(m.stock_gramos, m.punto_reposicion)
            const esFilamento = (m.unidad ?? 'g') === 'g'
            const unidadLabel = esFilamento ? 'g' : 'ud'
            return (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${esFilamento ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      {esFilamento ? 'g' : 'ud'}
                    </span>
                    <div>
                      <div className="font-medium text-slate-900">{m.nombre}</div>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {m.marca && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                            {m.marca}
                          </span>
                        )}
                        {m.color && <span className="text-xs text-slate-400">{m.color}</span>}
                      </div>
                      {m.proveedor && <div className="text-xs text-slate-400 mt-0.5">{m.proveedor}</div>}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {m.tipo}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                  {m.stock_gramos.toLocaleString('es-AR')}
                  <span className="text-xs text-slate-400 ml-1">{unidadLabel}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-500 tabular-nums">
                  {m.punto_reposicion.toLocaleString('es-AR')}
                  <span className="text-xs text-slate-400 ml-1">{unidadLabel}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-700 tabular-nums">
                  {ars(m.precio_por_kilo)}<span className="text-xs text-slate-400">/{esFilamento ? 'kg' : 'ud'}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${indicador.clase}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${indicador.color}`} />
                    {indicador.texto}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => onEditar(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      aria-label={`Editar ${m.nombre}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onEliminar(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Eliminar ${m.nombre}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
