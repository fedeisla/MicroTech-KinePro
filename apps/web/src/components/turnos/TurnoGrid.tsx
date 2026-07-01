 'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import {
  crearReservaPresencial,
  crearReservaFijaPresencial,
  cancelarReservaPresencial,
  chequearDescuento,
} from '@/services/reservasService'
import ReprogramarReservaModal from '@/components/turnos/ReprogramarReservaModal'
import InfoDialog, { tituloYMensajeDesdeApi } from '@/app/Components/InfoDialog'
import { fechasMismoDiaSemana, parseFechaLocal } from '@/lib/fechas'
import { ChevronDown } from 'lucide-react'
import type { TurnoResumen, TurnoDetalle, EstadoTurno } from '@/types/turno'
import { getTurnoById } from '@/services/turnosService'
import { registrarPago } from '@/services/pagosService'
import { obtenerPacientes } from '@/services/usuariosService'

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

type PacienteOption = {
  id: number
  nombre: string
  apellido: string
  email: string
}

function formatFecha(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export default function TurnoGrid({ fecha, turnos, loading, onTurnosActualizados }: TurnoGridProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<TurnoDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

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
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | ''>('')
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
  const [aplicaDescuento, setAplicaDescuento] = useState(false)
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0)
  const [errorDialog, setErrorDialog] = useState<{ titulo: string; mensaje: string } | null>(null)

  useEffect(() => {
    if (!esAdmin) return
    obtenerPacientes()
      .then((data) => setPacientes(data))
      .catch((err) => {
        toast.error('No se pudieron cargar los pacientes', { description: err.message })
      })
  }, [esAdmin])

  useEffect(() => {
    if (tipoReserva !== 'fijo' || !email) {
      setAplicaDescuento(false)
      setPorcentajeDescuento(0)
      return
    }
    chequearDescuento(email)
      .then((res) => {
        setAplicaDescuento(res.aplica)
        setPorcentajeDescuento(res.porcentaje)
      })
      .catch(() => {
        setAplicaDescuento(false)
        setPorcentajeDescuento(0)
      })
  }, [email, tipoReserva])

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
      if (!email) return toast.error('Seleccione un paciente')
      if (!metodoPago) return toast.error('Debe seleccionar un método de pago para continuar')
      setLoading(true)

      // 1. Crear la reserva
      const resReserva: any = await crearReservaPresencial(email, detalle.id)
      const reservaId = resReserva?.reservaId ?? resReserva?.id

      if (!reservaId) {
        // Si el back no devolvió un id usable, igual avisamos
        toast.success('Reserva registrada con éxito')
        setEmail('')
        setMetodoPago('')
        if (onReservaCreada) await onReservaCreada()
        return
      }

      // 2. Registrar el pago presencial asociado
      try {
        await registrarPago({ reserva_id: reservaId, metodo: metodoPago as 'EFECTIVO' | 'TARJETA' })
        toast.success('Turno registrado con éxito')
      } catch (pagoErr: any) {
        toast.error('No se pudo registrar el turno', { description: pagoErr.message || String(pagoErr) })
      }

      setEmail('')
      setMetodoPago('')
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
      const detalle = err?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.'
      const parsed = tituloYMensajeDesdeApi(detalle)
      setCancelarReservaId(null)
      setErrorDialog({
        titulo: parsed.mensaje ? parsed.titulo : 'No se pudo cancelar el turno',
        mensaje: parsed.mensaje || detalle,
      })
    } finally {
      setCancelando(false)
    }
  }

  const handleReservarFijosPorEmail = async () => {
    try {
      if (!email) return toast.error('Seleccione un paciente')
      if (!metodoPago) return toast.error('Debe seleccionar un método de pago para continuar')
      if (!fechaFin) return toast.error('Ingrese la fecha de fin')
      if (!fecha) return toast.error('No se pudo obtener la fecha del turno')

      setLoading(true)
      const fechas = calcularFechasFixas(fecha, fechaFin)
      if (fechas.length === 0) {
        return toast.error('La fecha de fin debe ser igual o posterior al turno seleccionado')
      }

      // 1. Crear las reservas fijas (el back las asocia al paciente del email seleccionado)
      const respuesta: any = await crearReservaFijaPresencial(email, detalle.id, fechas)
      toast.success(respuesta.message)

      // 2. Registrar el pago de cada reserva creada
      const reservaIds: number[] = respuesta?.reservaIds ?? []
      if (reservaIds.length > 0) {
        // Calculamos el monto por reserva (con descuento aplicado si corresponde)
        
        const precioUnitario = detalle.precio ?? 0
        const factorDescuento = aplicaDescuento ? (100 - porcentajeDescuento) / 100 : 1
        const montoPorReserva = precioUnitario * factorDescuento

        let pagosOk = 0
        let pagosFail = 0
        for (const rid of reservaIds) {
          try {
            await registrarPago({
              reserva_id: rid,
              metodo: metodoPago as 'EFECTIVO' | 'TARJETA',
              monto: montoPorReserva,
            })
            pagosOk++
          } catch (e) {
            pagosFail++
          }
        }
        if (pagosFail === 0) {
          toast.success(`Pagos registrados (${pagosOk})`)
        } else {
          toast.error(`Se registraron ${pagosOk} pagos, ${pagosFail} fallaron`)
        }
      }

      setEmail('')
      setMetodoPago('')
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
      {detalle.inscriptos.map((p) => (
        <div key={p.id} className="rounded-lg border border-neutral-bg bg-white px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800">
            {p.nombre} {p.apellido}
            {p.email ? <span className="text-slate-500 font-normal"> ({p.email})</span> : null}
          </span>
          {esAdmin && p.estado !== 'CANCELADA' && (
            <div className="flex gap-2 shrink-0">
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
      ))}

      <ReprogramarReservaModal
        abierto={reprogramarReservaId !== null}
        reservaId={reprogramarReservaId}
        fechaActual={fecha}
        tipoActividadId={detalle.tipoActividadId ?? null}
        actividadNombre={detalle.actividad}
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
          
          <label className="text-xs text-slate-600 mb-1 block">Paciente</label>
          <select
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md text-sm bg-white"
          >
            <option value="">Seleccionar paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.email}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
          
          <label className="text-xs text-slate-600 mb-1 block mt-2">Método de pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as 'EFECTIVO' | 'TARJETA' | '')}
            className="w-full p-2 border rounded-md text-sm bg-white"
          >
            <option value="">Seleccionar método</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Posnet</option>
          </select>
          
          {(() => {
            const precioUnitario = detalle.precio ?? 0
            const formatear = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    
            if (tipoReserva === 'unico') {
              return (
                <div className="mt-2 text-xs text-slate-600">
                  Monto a abonar: <span className="font-bold text-slate-800">${formatear(precioUnitario)}</span>
                </div>
              )
            }
          
            // Modalidad fijo
            let cantidadTurnos = 0
            if (fecha && fechaFin) {
              cantidadTurnos = calcularFechasFixas(fecha, fechaFin).length
            }
          
            const subtotal = precioUnitario * cantidadTurnos
            const descuento = aplicaDescuento ? subtotal * (porcentajeDescuento / 100) : 0
            const total = subtotal - descuento
          
            return (
              <div className="mt-2 text-xs text-slate-600">
                {cantidadTurnos > 0 ? (
                  <>
                    <div>Subtotal: <span className="font-semibold text-slate-700">${formatear(subtotal)}</span> <span className="text-slate-500">({cantidadTurnos} turnos × ${formatear(precioUnitario)})</span></div>
                    {aplicaDescuento && (
                      <div className="text-emerald-700">Descuento {porcentajeDescuento}%: -${formatear(descuento)}</div>
                    )}
                    <div className="mt-1">Total a cobrar: <span className="font-bold text-slate-800">${formatear(total)}</span></div>
                    {!aplicaDescuento && email && (
                      <div className="text-amber-700 mt-1">El paciente no califica para descuento (tiene ausencias o reprogramaciones).</div>
                    )}
                  </>
                ) : (
                  <>Monto total a abonar: <span className="font-bold text-slate-800">$-</span> <span className="text-slate-400">(ingresá una fecha de fin)</span></>
                )}
              </div>
            )
          })()}

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

      <InfoDialog
        abierto={errorDialog !== null}
        variante="error"
        titulo={errorDialog?.titulo ?? ''}
        mensaje={errorDialog?.mensaje}
        onCerrar={() => setErrorDialog(null)}
      />
    </div>
  )
}
