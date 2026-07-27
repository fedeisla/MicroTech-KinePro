'use client'

import { Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  abierto: boolean
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  variante?: 'peligro' | 'normal'
  procesando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'normal',
  procesando = false,
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  if (!abierto) return null

  const colorConfirmar =
    variante === 'peligro'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-kine-blue hover:bg-kine-blue-deep text-white'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={procesando ? undefined : onCancelar}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold text-slate-800">{titulo}</h3>
        <p className="text-sm text-slate-600 mb-6">{mensaje}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={`px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2 ${colorConfirmar}`}
          >
            {procesando && <Loader2 className="w-4 h-4 animate-spin" />}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}