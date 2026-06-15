 'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  crearReservaPresencial,
  crearReservaFijaPresencial,
  cancelarReservaPresencial,
} from '@/services/reservasService'
import ReprogramarReservaModal from '@/components/turnos/ReprogramarReservaModal'
import { fechasMismoDiaSemana, parseFechaLocal } from '@/lib/fechas'
import { ChevronDown } from 'lucide-react'
import type { TurnoResumen, TurnoDetalle, EstadoTurno } from '@/types/turno'
import { getTurnoById } from '@/services/turnosService'
import { marcarAsistencia } from '@/services/asistenciaService'

interface TurnoGridProps {
  fecha: string | null
  turnos: TurnoResumen[]
  loading: boolean
  onTurnosActualizados?: () => void
}

const ESTADO_BADGE: Record<EstadoTurno, string> = {
  DISPONIBLE: 'bg-progreen/15 text-progreen-deep',
  RESERVADO:  'bg-kineblue/15 text-kineblue-deep',
  CANCELADO:  'bg-red-100 text-red-700',
}

const ESTADO_LABEL: Record<EstadoTurno, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADO:  'Reservado',
  CANCELADO:  'Cancelado',
}

function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export default function TurnoGrid({ fecha, turnos, loading, onTurnosActualizados }: TurnoGridProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<TurnoDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Colapsar al cambiar de fecha
  useEffect(() => {
    setExpandedId(null)
    setDetalle(null)
  }, [fecha])

  async function handleToggle(turno: TurnoResumen) {
    if (expandedId === turno.id) {
      setExpandedId(null)
      setDetalle(null)
      return
    }
    setExpandedId(turno.id)
    setDetalle(null)
    setLoadingDetalle(true)
    try {
      setDetalle(await getTurnoById(turno.id))
    } finally {
      setLoadingDetalle(false)
    }
  }

  if (!fecha) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-neutral-gray/40 bg-neutral-bg/50 text-neutral-gray">
        Seleccioná una fecha en el calendario para ver los turnos.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-neutral-bg bg-white">
        <span className="text-neutral-gray">Cargando turnos…</span>
      </div>
    )
  }

  if (turnos.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-neutral-bg bg-white text-neutral-gray">
        No existen turnos creados en la fecha seleccionada.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-bg bg-white shadow-sm">
      <div className="border-b border-neutral-bg px-4 py-3">
        <h2 className="text-sm font-semibold text-kineblue">
          Turnos del {formatFecha(fecha)}
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-neutral-bg/60 text-xs uppercase text-neutral-gray">
          <tr>
            <th className="px-4 py-2 text-left">Horario</th>
            <th className="px-4 py-2 text-left">Actividad</th>
            <th className="px-4 py-2 text-left">Ocupación</th>
            <th className="px-4 py-2 text-center">Estado</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-bg">
          {turnos.map((turno) => {
            const expanded = expandedId === turno.id
            const reservas = Number(turno.reservasActuales)
            const capacidad = Number(turno.capacidad)
            const ocupacion = capacidad > 0 ? Math.round((reservas / capacidad) * 100) : 0
            return (
              <>
                <tr
                  key={turno.id}
                  onClick={() => handleToggle(turno)}
                  className="cursor-pointer transition-colors hover:bg-kineblue/5"
                >
                  <td className="px-4 py-3 font-medium text-kineblue">{turno.horario}</td>
                  <td className="px-4 py-3 text-gray-700">{turno.actividad}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{turno.reservasActuales}/{turno.capacidad} inscriptos</span>
                        <span className="flex-shrink-0 text-slate-400">{turno.espaciosLibres} libres</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#005C9C] transition-all duration-200"
                          style={{ width: `${ocupacion}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[turno.estado]}`}>
                      {ESTADO_LABEL[turno.estado]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ChevronDown
                      className={`mx-auto h-4 w-4 text-neutral-gray transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                  </td>
                </tr>

                {expanded && (
                  <tr key={`${turno.id}-detalle`}>
                    <td colSpan={6} className="bg-neutral-bg/30 px-6 py-4">
                      {loadingDetalle && !detalle ? (
                        <p className="text-center text-xs text-neutral-gray">Cargando detalle…</p>
                      ) : detalle ? (
                        <DetalleInscriptos detalle={detalle} fecha={fecha} onReservaCreada={async () => {
                          setLoadingDetalle(true)
                          try {
                            setDetalle(await getTurnoById(detalle.id))
                            onTurnosActualizados?.()
                          } finally {
                            setLoadingDetalle(false)
                          }
                        }} />
                      ) : null}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Detalle expandido ────────────────────────────────────────────────────────

function DetalleInscriptos({ detalle, fecha, onReservaCreada }: { detalle: TurnoDetalle; fecha: string | null; onReservaCreada?: () => Promise<void> }) {
  const { rol } = useAuth()
  const esAdmin = rol === 'ADMIN' || rol === 'OWNER'
  const [email, setEmail] = useState('')
  const [tipoReserva, setTipoReserva] = useState<'unico' | 'fijo'>('unico')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [reprogramarReservaId, setReprogramarReservaId] = useState<number | null>(null)
  const [cancelarReservaId, setCancelarReservaId] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)

  const [procesandoAsistencia, setProcesandoAsistencia] = useState<number | null>(null)

  // Habilitado SOLO desde 30 min antes del inicio (sin tope superior). Idéntico a la regla del back.
  function habilitadoParaMarcar(): boolean {
    if (!fecha || !detalle.horario) return false
    const [h, m] = detalle.horario.split(':').map(Number)
    const inicio = new Date(`${fecha}T00:00:00`)
    inicio.setHours(h, m, 0, 0)
    const treintaAntes = new Date(inicio.getTime() - 30 * 60 * 1000)
    return new Date() >= treintaAntes
  }

  async function handleMarcar(reservaId: number, asistio: boolean) {
    setProcesandoAsistencia(reservaId)
    try {
      const res = await marcarAsistencia(reservaId, asistio)
      toast.success(res.message)
      if (onReservaCreada) await onReservaCreada()
    } catch (e: any) {
      toast.error('Error', { description: e.message })
    } finally {
      setProcesandoAsistencia(null)
    }
  }

  const puedeMarcar = habilitadoParaMarcar()


  if (detalle.inscriptos.length === 0 && !esAdmin) {
    return <p className="text-xs text-neutral-gray">Sin inscriptos en este turno.</p>
  }

  const calcularFechasFixas = (fechaInicio: string, fechaFinStr: string): Date[] => {
    const inicio = parseFechaLocal(fechaInicio)
    const fin = parseFechaLocal(fechaFinStr)
    if (fin < inicio) return []
    return fechasMismoDiaSemana(inicio, fin)
  }

  const handleReservarPorEmail = async () => {
    try {
      if (!email) return toast.error('Ingrese el email del paciente')
      setLoading(true)
      await crearReservaPresencial(email, detalle.id)
      toast.success('Reserva registrada con éxito')
      setEmail('')
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudo crear la reserva', { description: err.message || String(err) })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelarConfirmado = async () => {
    if (!cancelarReservaId) return
    setCancelando(true)
    try {
      const res = await cancelarReservaPresencial(cancelarReservaId)
      toast.success(res.message)
      setCancelarReservaId(null)
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudo cancelar el turno', { description: err.message || String(err) })
    } finally {
      setCancelando(false)
    }
  }

  const handleReservarFijosPorEmail = async () => {
    try {
      if (!email) return toast.error('Ingrese el email del paciente')
      if (!fechaFin) return toast.error('Ingrese la fecha de fin')
      if (!fecha) return toast.error('No se pudo obtener la fecha del turno')
      
      setLoading(true)
      const fechas = calcularFechasFixas(fecha, fechaFin)
      if (fechas.length === 0) {
        return toast.error('La fecha de fin debe ser igual o posterior al turno seleccionado')
      }
      const respuesta = await crearReservaFijaPresencial(email, detalle.id, fechas)
      toast.success(respuesta.message)
      setEmail('')
      setFechaFin('')
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudieron crear las reservas', { description: err.message || String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-gray mb-3">
        Inscriptos — {detalle.reservasActuales} / {detalle.capacidad}
      </p>
      {detalle.inscriptos.map((p) => {
        const yaMarcado = p.estado === 'ASISTIO' || p.estado === 'AUSENTE'
        return (
          <div key={p.id} className="rounded-lg border border-neutral-bg bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800">
                {p.nombre} {p.apellido}
                {p.email ? <span className="text-slate-500 font-normal"> ({p.email})</span> : null}
              </span>
              {p.estado === 'ASISTIO' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Asistió</span>
              )}
              {p.estado === 'AUSENTE' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">No asistió</span>
              )}
            </div>
            {esAdmin && p.estado !== 'CANCELADA' && (
              <div className="flex gap-2 shrink-0 flex-wrap">
                {!yaMarcado && (
                  <>
                    <button
                      type="button"
                      disabled={!puedeMarcar || procesandoAsistencia === p.id}
                      onClick={() => handleMarcar(p.id, true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!puedeMarcar ? 'Disponible desde 30 minutos antes del inicio' : ''}
                    >
                      Marcar asistencia
                    </button>
                    <button
                      type="button"
                      disabled={!puedeMarcar || procesandoAsistencia === p.id}
                      onClick={() => handleMarcar(p.id, false)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!puedeMarcar ? 'Disponible desde 30 minutos antes del inicio' : ''}
                    >
                      Marcar inasistencia
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setReprogramarReservaId(p.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-kineblue/30 text-kineblue hover:bg-kineblue/5"
                >
                  Reprogramar
                </button>
                <button
                  type="button"
                  onClick={() => setCancelarReservaId(p.id)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                >
                  Cancelar turno
                </button>
              </div>
            )}
          </div>
        )
      })}

      <ReprogramarReservaModal
        abierto={reprogramarReservaId !== null}
        reservaId={reprogramarReservaId}
        fechaActual={fecha}
        presencial
        onClose={() => setReprogramarReservaId(null)}
        onReprogramado={() => {
          setReprogramarReservaId(null)
          void onReservaCreada?.()
        }}
      />

      {cancelarReservaId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !cancelando && setCancelarReservaId(null)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Cancelar turno</h3>
            <p className="mt-1 text-sm text-slate-500">¿Confirmás que querés cancelar este turno del paciente?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={cancelando}
                onClick={() => setCancelarReservaId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={cancelando}
                onClick={handleCancelarConfirmado}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {esAdmin && (
        <div className="mt-3 border-t pt-3 space-y-2">
          <label className="text-xs text-slate-600 mb-1 block">Email del paciente</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" className="w-full p-2 border rounded-md text-sm" />
          
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="radio" name="tipo" value="unico" checked={tipoReserva === 'unico'} onChange={(e) => setTipoReserva('unico')} />
              Turno único
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="radio" name="tipo" value="fijo" checked={tipoReserva === 'fijo'} onChange={(e) => setTipoReserva('fijo')} />
              Turnos fijos
            </label>
          </div>

          {tipoReserva === 'unico' ? (
            <button disabled={loading} onClick={handleReservarPorEmail} className="w-full px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700">
              Anotar
            </button>
          ) : (
            <>
              <label className="text-xs text-slate-600 block">Fecha de fin (YYYY-MM-DD)</label>
              <input value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} type="date" className="w-full p-2 border rounded-md text-sm" />
              <button disabled={loading} onClick={handleReservarFijosPorEmail} className="w-full px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700">
                Anotar turnos fijos
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
