'use client'

type BarItem = {
  label: string
  value: number
  displayValue?: string
}

type Props = {
  items: BarItem[]
  colorClass?: string
}

export default function GraficoBarras({
  items,
  colorClass = 'bg-kine-blue',
}: Props) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const porcentaje = (item.value / max) * 100
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-700">{item.label}</span>
              <span className="font-semibold text-kine-blue-deep">
                {item.displayValue ?? item.value}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
