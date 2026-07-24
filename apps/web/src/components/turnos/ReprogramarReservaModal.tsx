'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import InfoDialog, { tituloYMensajeDesdeApi, type InfoDialogVariante } from '@/components/InfoDialog'
import { apiFetch } from '@/lib/api'
import { reprogramarReserva, reprogramarReservaPresencial } from '@/services/reservasService'

type ResultadoDialog = {
  variante: InfoDialogVariante
  titulo: string
  mensaje: string
  alCerrar?: () => void
}

type TurnoDisponibleApi = {
  id: number
  actividad?: string
  hora_inicio?: string
  fecha?: string
  espacios_libres?: number
  estado?: string
  tipoActividad_id?: number
  tipoActividad?: { nombre: string } | null
}

function horaDesdeIso(iso: string | undefined): string {
  if (!iso) return ''
  // "1970-01-01T10:00:00.000Z" -> "10:00"
  return iso.substring(11, 16)
}

function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

interface Props {
  abierto: boolean
  reservaId: number | null
  fechaActual: string | null
  tipoActividadId: number | null
  actividadNombre?: string | null
  presencial?: boolean
  onClose: () => void
  onReprogramado: () => void
}

export default function ReprogramarReservaModal({
  abierto,
  reservaId,
  fechaActual,
  tipoActividadId,
  actividadNombre,
  presencial = false,
  onClose,
  onReprogramado,
}: Props) {
  const [fecha, setFecha] = useState('')
  const [turnos, setTurnos] = useState<TurnoDisponibleApi[]>([])
  const [cargandoTurnos, setCargandoTurnos] = useState(false)
  const [turnoId, setTurnoId] = useState<string>('')
  const [guardando, setGuardando] = useState(false)
  const [resultadoDialog, setResultadoDialog] = useState<ResultadoDialog | null>(null)

  useEffect(() => {
    if (!abierto) return
    setFecha(fechaActual ?? '')
    setTurnoId('')
    setTurnos([])
    setResultadoDialog(null)
  }, [abierto, fechaActual])

  function cerrarResultadoDialog() {
    const alCerrar = resultadoDialog?.alCerrar
    setResultadoDialog(null)
    alCerrar?.()
  }

  useEffect(() => {
    if (!abierto) return
    if (!fecha) return
    setCargandoTurnos(true)
    apiFetch<TurnoDisponibleApi[]>(`/turnos?fecha=${fecha}`)
      .then((data) =>
        setTurnos(
          (data ?? []).filter(
            (t) =>
              (t.espacios_libres ?? 0) > 0 &&
              t.estado !== 'CANCELADO' &&
              (tipoActividadId == null || t.tipoActividad_id === tipoActividadId),
          ),
        ),
      )
      .catch((e: any) => toast.error('No se pudieron cargar los turnos', { description: e.message }))
      .finally(() => setCargandoTurnos(false))
  }, [abierto, fecha, tipoActividadId])

  const opciones = useMemo(() => {
    return turnos
      .slice()
      .sort((a, b) => horaDesdeIso(a.hora_inicio).localeCompare(horaDesdeIso(b.hora_inicio)))
      .map((t) => {
        const actividad = t.actividad ?? t.tipoActividad?.nombre ?? 'Actividad'
        const hora = horaDesdeIso(t.hora_inicio)
        const libres = t.espacios_libres ?? 0
        return {
          id: String(t.id),
          label: `${hora} · ${actividad} (libres: ${libres})`,
        }
      })
  }, [turnos])

  if (!abierto) return null

  async function handleConfirmar() {
    if (!reservaId) return
    if (!turnoId) {
      toast.error('Seleccioná un turno para reprogramar')
      return
    }
    setGuardando(true)
    try {
      const res = presencial
        ? await reprogramarReservaPresencial(reservaId, Number(turnoId))
        : await reprogramarReserva(reservaId, Number(turnoId))
      const { titulo, mensaje } = tituloYMensajeDesdeApi(res.message)
      const variante: InfoDialogVariante =
        res.pierdeDescuento || (res.cantReprogramaciones ?? 0) >= 2 ? 'advertencia' : 'exito'
      setResultadoDialog({
        variante,
        titulo,
        mensaje,
        alCerrar: () => {
          onReprogramado()
          onClose()
        },
      })
    } catch (e: any) {
      const detalle = e?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.'
      const parsed = tituloYMensajeDesdeApi(detalle)
      setResultadoDialog({
        variante: 'error',
        titulo: parsed.mensaje ? parsed.titulo : 'No se pudo reprogramar',
        mensaje: parsed.mensaje || detalle,
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold text-slate-800">Reprogramar turno</h3>
        <p className="mt-1 text-sm text-slate-500">
          Elegí una nueva fecha y un turno con cupo disponible
          {actividadNombre ? ` de ${actividadNombre}` : ' de la misma actividad'}.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
            />
            {fecha && (
              <p className="mt-1 text-xs text-slate-500">Mostrando turnos para {formatFecha(fecha)}.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Turnos disponibles</label>
            <select
              value={turnoId}
              onChange={(e) => setTurnoId(e.target.value)}
              disabled={cargandoTurnos}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue bg-white disabled:opacity-60"
            >
              <option value="">
                {cargandoTurnos
                  ? 'Cargando…'
                  : opciones.length
                    ? 'Seleccioná un turno'
                    : actividadNombre
                      ? `No hay turnos con cupo de ${actividadNombre}`
                      : 'No hay turnos con cupo de la misma actividad'}
              </option>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={guardando}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-kine-blue text-white hover:bg-kine-blue-deep disabled:opacity-50 flex items-center gap-2"
          >
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>

      <InfoDialog
        abierto={resultadoDialog !== null}
        variante={resultadoDialog?.variante ?? 'exito'}
        titulo={resultadoDialog?.titulo ?? ''}
        mensaje={resultadoDialog?.mensaje}
        onCerrar={cerrarResultadoDialog}
      />
    </div>
  )
}

