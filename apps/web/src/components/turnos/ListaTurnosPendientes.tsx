'use client'

import { CalendarClock, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMemo, useState } from 'react'
import type { TurnoPacientePendiente } from '@/types/turnoPaciente'
import { cancelarReserva } from '@/services/reservasService'
import ReprogramarReservaModal from '@/components/turnos/ReprogramarReservaModal'
import InfoDialog, { tituloYMensajeDesdeApi } from '@/app/Components/InfoDialog'

function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

interface ListaTurnosPendientesProps {
  turnos: TurnoPacientePendiente[]
  onActualizado?: () => void
}

export default function ListaTurnosPendientes({ turnos, onActualizado }: ListaTurnosPendientesProps) {
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null)
  const [reprogramarReservaId, setReprogramarReservaId] = useState<number | null>(null)
  const [errorDialog, setErrorDialog] = useState<{ titulo: string; mensaje: string } | null>(null)

  const reservaSeleccionada = useMemo(
    () => (reprogramarReservaId ? turnos.find((t) => t.id === reprogramarReservaId) ?? null : null),
    [reprogramarReservaId, turnos],
  )

  if (turnos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">No posee turnos pendientes</p>
      </div>
    )
  }

  async function handleCancelarConfirmado(reservaId: number) {
    try {
      const res = await cancelarReserva(reservaId)
      toast.success(res.message)
      setConfirmCancelId(null)
      onActualizado?.()
    } catch (e: any) {
      const detalle = e?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.'
      const parsed = tituloYMensajeDesdeApi(detalle)
      setConfirmCancelId(null)
      setErrorDialog({
        titulo: parsed.mensaje ? parsed.titulo : 'No se pudo cancelar el turno',
        mensaje: parsed.mensaje || detalle,
      })
    }
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {turnos.map((turno) => (
          <li key={turno.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{turno.actividad}</p>
                  <p className="text-sm text-slate-500">
                    {formatFecha(turno.fecha)} · {turno.hora} hs
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReprogramarReservaId(turno.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-kine-blue px-3 py-1.5 text-xs font-semibold text-kine-blue hover:bg-kine-blue/5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancelId(turno.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {confirmCancelId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setConfirmCancelId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar cancelación"
          >
            <h3 className="text-lg font-bold text-slate-800">Cancelar turno</h3>
            <p className="mt-1 text-sm text-slate-500">¿Confirmás que querés cancelar este turno?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancelId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => handleCancelarConfirmado(confirmCancelId)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <ReprogramarReservaModal
        abierto={reprogramarReservaId !== null}
        reservaId={reprogramarReservaId}
        fechaActual={reservaSeleccionada?.fecha ?? null}
        tipoActividadId={reservaSeleccionada?.tipoActividadId ?? null}
        actividadNombre={reservaSeleccionada?.actividad ?? null}
        onClose={() => setReprogramarReservaId(null)}
        onReprogramado={() => onActualizado?.()}
      />

      <InfoDialog
        abierto={errorDialog !== null}
        variante="error"
        titulo={errorDialog?.titulo ?? ''}
        mensaje={errorDialog?.mensaje}
        onCerrar={() => setErrorDialog(null)}
      />
    </>
  )
}
