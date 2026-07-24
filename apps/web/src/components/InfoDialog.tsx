'use client'

import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

export type InfoDialogVariante = 'exito' | 'error' | 'advertencia'

interface InfoDialogProps {
  abierto: boolean
  titulo: string
  mensaje?: string
  variante?: InfoDialogVariante
  textoBoton?: string
  onCerrar: () => void
}

const estilosVariante: Record<
  InfoDialogVariante,
  { icono: typeof CheckCircle2; iconClass: string; ringClass: string }
> = {
  exito: {
    icono: CheckCircle2,
    iconClass: 'text-emerald-600',
    ringClass: 'bg-emerald-50',
  },
  advertencia: {
    icono: AlertTriangle,
    iconClass: 'text-amber-600',
    ringClass: 'bg-amber-50',
  },
  error: {
    icono: AlertCircle,
    iconClass: 'text-red-600',
    ringClass: 'bg-red-50',
  },
}

/** Separa "Título corto. Detalle largo…" en título y cuerpo para el diálogo. */
export function tituloYMensajeDesdeApi(texto: string): { titulo: string; mensaje: string } {
  const puntoEspacio = texto.indexOf('. ')
  if (puntoEspacio === -1) {
    return { titulo: texto, mensaje: '' }
  }
  return {
    titulo: texto.slice(0, puntoEspacio + 1),
    mensaje: texto.slice(puntoEspacio + 2),
  }
}

export default function InfoDialog({
  abierto,
  titulo,
  mensaje = '',
  variante = 'exito',
  textoBoton = 'Entendido',
  onCerrar,
}: InfoDialogProps) {
  if (!abierto) return null

  const { icono: Icono, iconClass, ringClass } = estilosVariante[variante]
  const cuerpo = mensaje.trim() || titulo
  const encabezado = mensaje.trim() ? titulo : null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-dialog-titulo"
        aria-describedby="info-dialog-mensaje"
      >
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${ringClass}`}>
          <Icono className={`h-8 w-8 ${iconClass}`} aria-hidden />
        </div>

        {encabezado && (
          <h3 id="info-dialog-titulo" className="text-center text-lg font-bold text-slate-800">
            {encabezado}
          </h3>
        )}

        <p
          id="info-dialog-mensaje"
          className={`text-center text-base leading-relaxed text-slate-600 ${
            encabezado ? 'mt-3' : 'text-lg font-semibold text-slate-800'
          }`}
        >
          {cuerpo}
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onCerrar}
            className="min-w-[8rem] rounded-lg bg-kine-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-kine-blue-deep"
          >
            {textoBoton}
          </button>
        </div>
      </div>
    </div>
  )
}
