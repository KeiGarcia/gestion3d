interface KpiCardProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  icono: React.ReactNode
  colorIcono?: string
}

export default function KpiCard({ titulo, valor, subtitulo, icono, colorIcono = 'bg-indigo-100 text-indigo-600' }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${colorIcono}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{titulo}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{valor}</p>
        {subtitulo && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitulo}</p>}
      </div>
    </div>
  )
}
