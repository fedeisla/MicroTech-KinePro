'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { getTurnosByFecha, getTurnoById } from '@/services/turnosService'
import { registrarAsistenciaReserva } from '@/services/reservasService'
import type { TurnoDetalle, TurnoResumen, EstadoReserva } from '@/types/turno'

function formatFecha(fecha: string) {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

function fechaHoyLocal(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

function obtenerFechaHoraTurno(fecha: string, horario: string) {
  return new Date(`${fecha}T${horario}:00`)
}

function minutosHastaTurno(fecha: string, horario: string) {
  return (obtenerFechaHoraTurno(fecha, horario).getTime() - Date.now()) / (1000 * 60)
}

export default function ProximosTurnosHome() {
  const { rol } = useAuth()
  const esAdminOwner = rol === 'ADMIN' || rol === 'OWNER'

  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyLocal())
  const [turnos, setTurnos] = useState<TurnoResumen[]>([])
  const [turnosLoading, setTurnosLoading] = useState(true)
  const [turnosError, setTurnosError] = useState<string | null>(null)
  const [selectedTurnoId, setSelectedTurnoId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<TurnoDetalle | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [procesandoReservaId, setProcesandoReservaId] = useState<number | null>(null)

  useEffect(() => {
    if (!esAdminOwner) return

    let activo = true
    setTurnosLoading(true)
    setTurnosError(null)

    async function fetchTurnos() {
      try {
        const data = await getTurnosByFecha(fechaSeleccionada)
        if (!activo) return
        setTurnos(data)
      } catch (err: any) {
        if (!activo) return
        setTurnosError(err.message ?? 'No se pudieron cargar los turnos del día')
      } finally {
        if (!activo) return
        setTurnosLoading(false)
      }
    }

    fetchTurnos()
    return () => { activo = false }
  }, [fechaSeleccionada, esAdminOwner])

  useEffect(() => {
    if (selectedTurnoId === null) {
      setDetalle(null)
      return
    }

    let activo = true
    setDetalleLoading(true)
    const turnoId = selectedTurnoId

    async function fetchDetalle() {
      try {
        const data = await getTurnoById(turnoId)
        if (!activo) return
        setDetalle(data)
      } catch (err: any) {
        if (!activo) return
        toast.error(err.message || 'No se pudo cargar el detalle del turno')
      } finally {
        if (!activo) return
        setDetalleLoading(false)
      }
    }

    fetchDetalle()
    return () => { activo = false }
  }, [selectedTurnoId])

  const handleSeleccionarTurno = (turnoId: number) => {
    setSelectedTurnoId(turnoId)
  }

  const handleRegistrarAsistencia = async (reservaId: number, estado: 'ASISTIO' | 'AUSENTE') => {
    try {
      setProcesandoReservaId(reservaId)
      const respuesta = await registrarAsistenciaReserva(reservaId, estado)
      toast.success(respuesta.message)
      if (respuesta.penalizacionAplicada) {
        toast.success('Se notificó al paciente sobre la pérdida del descuento por ausencias')
      }
      if (selectedTurnoId !== null) {
        setDetalleLoading(true)
        const data = await getTurnoById(selectedTurnoId)
        setDetalle(data)
      }
    } catch (err: any) {
      toast.error(err.message || 'No se pudo registrar la asistencia')
    } finally {
      setProcesandoReservaId(null)
      setDetalleLoading(false)
    }
  }

  if (!esAdminOwner) return null

  const fechaFormateada = formatFecha(fechaSeleccionada)

  return (
    <section className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Control de asistencias</h2>
          <p className="text-sm text-slate-500">Registra la presencia o ausencia de los pacientes en los turnos del día.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Fecha actual</p>
          <p className="text-lg font-semibold text-slate-900">{fechaFormateada}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Turnos del día</h3>

          {turnosLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">Cargando turnos…</div>
          ) : turnosError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">{turnosError}</div>
          ) : turnos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">No hay turnos programados para hoy.</div>
          ) : (
            <div className="space-y-3">
              {turnos.map((turno) => (
                <button
                  key={turno.id}
                  type="button"
                  onClick={() => handleSeleccionarTurno(turno.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition-shadow ${selectedTurnoId === turno.id ? 'border-teal-500 bg-white shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{turno.actividad}</p>
                      <p className="mt-2 text-base font-semibold text-slate-900">{formatFecha(fechaSeleccionada)} · {turno.horario} hs</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{turno.reservasActuales}/{turno.capacidad}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{turno.espaciosLibres} cupos libres</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Pacientes inscriptos</h3>

          {!selectedTurnoId ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">Seleccioná un turno para ver los pacientes.</div>
          ) : detalleLoading && !detalle ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">Cargando detalle del turno…</div>
          ) : detalle ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{detalle.actividad}</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{detalle.horario} hs</p>
              </div>

              {minutosHastaTurno(detalle.fecha, detalle.horario) > 30 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
                  El control de asistencia al turno se habilitará 30 minutos antes de su horario de inicio.
                </div>
              ) : detalle.inscriptos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">No hay inscriptos en este turno.</div>
              ) : (
                <div className="space-y-3">

                  {detalle.inscriptos.map((p) => {
                    const esPresente = p.estado === 'ASISTIO'
                    const esAusente = p.estado === 'AUSENTE'
                    const puedeMarcar = minutosHastaTurno(detalle.fecha, detalle.horario) <= 30

                    return (
                      <div key={p.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{p.nombre} {p.apellido}</p>
                            <div className="text-sm text-slate-500">
                              {p.email && <div>{p.email}</div>}
                              {p.dni && <div>DNI {p.dni}</div>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:w-[13rem]">
                            {esPresente || esAusente ? (
                              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${esPresente ? 'bg-kine-blue/15 text-kine-blue-deep border border-kine-blue/20' : 'bg-slate-100 text-slate-600 border border-slate-200'} cursor-default`}>
                                {esPresente ? 'Presente' : 'Ausente'}
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRegistrarAsistencia(p.id, 'ASISTIO')}
                                  disabled={!puedeMarcar || procesandoReservaId === p.id}
                                  className="rounded-full border border-kine-blue bg-kine-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-kine-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Presente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegistrarAsistencia(p.id, 'AUSENTE')}
                                  disabled={!puedeMarcar || procesandoReservaId === p.id}
                                  className="rounded-full border border-kine-blue/30 bg-kine-blue/5 px-4 py-2 text-sm font-semibold text-kine-blue transition-colors hover:bg-kine-blue/10 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Ausente
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
