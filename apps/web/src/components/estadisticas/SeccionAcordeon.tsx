'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Props = {
  titulo: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function SeccionAcordeon({ titulo, children, defaultOpen = false }: Props) {
  const [abierto, setAbierto] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="font-medium text-kine-blue-deep">{titulo}</span>
        <ChevronDown
          className={`h-5 w-5 text-kine-blue transition-transform duration-200 ${
            abierto ? 'rotate-180' : ''
          }`}
        />
      </button>
      {abierto && (
        <div className="border-t border-slate-100 px-5 py-4">{children}</div>
      )}
    </div>
  )
}
