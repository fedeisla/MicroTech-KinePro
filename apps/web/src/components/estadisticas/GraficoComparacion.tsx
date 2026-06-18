'use client'

type Props = {
  parte: number
  total: number
  etiqueta?: string
  valorDisplay?: string
  colorClass?: string
}

function formatearPorcentaje(parte: number, total: number): string {
  if (total === 0) return '0%'
  const pct = (parte / total) * 100
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`
}

export default function GraficoComparacion({
  parte,
  total,
  etiqueta,
  valorDisplay,
  colorClass = 'bg-kine-blue',
}: Props) {
  const porcentaje = total === 0 ? 0 : Math.min((parte / total) * 100, 100)
  const textoValor =
    valorDisplay ?? `${parte} de ${total} reservas (${formatearPorcentaje(parte, total)})`

  return (
    <div>
      <div className={`mb-1.5 flex items-center text-sm ${etiqueta ? 'justify-between' : 'justify-start'}`}>
        {etiqueta && <span className="text-slate-700">{etiqueta}</span>}
        <span className="font-semibold text-kine-blue-deep">{textoValor}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  )
}
