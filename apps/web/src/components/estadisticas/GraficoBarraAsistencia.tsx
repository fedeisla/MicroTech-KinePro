'use client'

type Props = {
  presentes: number
  ausentes: number
  total: number
}

function formatearPorcentaje(parte: number, total: number): string {
  if (total === 0) return '0%'
  const pct = (parte / total) * 100
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`
}

export default function GraficoBarraAsistencia({ presentes, ausentes, total }: Props) {
  const pctAusentes = total === 0 ? 0 : (ausentes / total) * 100
  const pctPresentes = total === 0 ? 0 : (presentes / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-kine-blue">
          Presentes {formatearPorcentaje(presentes, total)}
        </span>
        <span className="font-semibold text-red-700">
          Ausentes {formatearPorcentaje(ausentes, total)}
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
        {pctPresentes > 0 && (
          <div
            className="h-full bg-kine-blue-light transition-all duration-500"
            style={{ width: `${pctPresentes}%` }}
          />
        )}
        {pctAusentes > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${pctAusentes}%` }}
          />
        )}
      </div>
    </div>
  )
}
