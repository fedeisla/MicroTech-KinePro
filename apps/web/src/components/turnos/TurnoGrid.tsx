'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChevronDown } from 'lucide-react'
import type { TurnoResumen, TurnoDetalle, EstadoTurno } from '@/types/turno'
import { getTurnoById } from '@/services/turnosService'
import TabInscriptos from './TabInscriptos'
import TabEspera from './TabEspera'
import { toast } from 'sonner' // o la librería que uses

import { fechasMismoDiaSemana, parseFechaLocal } from '@/lib/fechas'
import { tituloYMensajeDesdeApi } from '@/app/Components/InfoDialog'
import { obtenerPacientes } from '@/services/usuariosService'
import { cancelarReservaPresencial, chequearDescuento, crearReservaFijaPresencial, crearReservaPresencial } from '@/services/reservasService'
import { registrarPago } from '@/services/pagosService'



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
            const estaLleno = turno.espaciosLibres <= 0

            return (
              <React.Fragment key={turno.id}>
                <tr
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
                  <tr>
                    <td colSpan={6} className="bg-neutral-bg/30 px-6 py-4">
                      {loadingDetalle && !detalle ? (
                        <p className="text-center text-xs text-neutral-gray">Cargando detalle…</p>
                      ) : detalle ? (
                        <DetalleInscriptos 
                          detalle={detalle} 
                          fecha={fecha} 
                          estaLleno={estaLleno}
                          onReservaCreada={async () => {
                            setLoadingDetalle(true)
                            try {
                              setDetalle(await getTurnoById(detalle.id))
                              onTurnosActualizados?.()
                            } finally {
                              setLoadingDetalle(false)
                            }
                          }} 
                        />
                      ) : null}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Detalle expandido ────────────────────────────────────────────────────────

function DetalleInscriptos({ 
  detalle, 
  fecha, 
  estaLleno = false, 
  onReservaCreada 
}: { 
  detalle: TurnoDetalle; 
  fecha: string | null; 
  estaLleno?: boolean;
  onReservaCreada?: () => Promise<void> 
}) {
  const { rol } = useAuth()
  const esAdmin = rol === 'ADMIN' || rol === 'OWNER'
  
  // Estado para manejar las pestañas (faltaba en tu código)
  const [tabActiva, setTabActiva] = useState<'INSCRIPTOS' | 'ESPERA'>('INSCRIPTOS')

  const [email, setEmail] = useState('')
  const [tipoReserva, setTipoReserva] = useState<'unico' | 'fijo'>('unico')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [reprogramarReservaId, setReprogramarReservaId] = useState<number | null>(null)
  const [cancelarReservaId, setCancelarReservaId] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | ''>('')
  const [pacientes, setPacientes] = useState<any[]>([]) // Idealmente usar PacienteOption[]
  const [aplicaDescuento, setAplicaDescuento] = useState(false)
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0)
  const [errorDialog, setErrorDialog] = useState<{ titulo: string; mensaje: string } | null>(null)

  useEffect(() => {
    if (!esAdmin) return
    // NOTA: obtenerPacientes debe estar importado
    obtenerPacientes()
      .then((data: React.SetStateAction<any[]>) => setPacientes(data))
      .catch((err: { message: any }) => {
        // NOTA: toast debe estar importado
        toast.error('No se pudieron cargar los pacientes', { description: err.message })
      })
  }, [esAdmin])

  useEffect(() => {
    if (tipoReserva !== 'fijo' || !email) {
      setAplicaDescuento(false)
      setPorcentajeDescuento(0)
      return
    }
    // NOTA: chequearDescuento debe estar importado
    chequearDescuento(email)
      .then((res: { aplica: boolean | ((prevState: boolean) => boolean); porcentaje: React.SetStateAction<number> }) => {
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
    // NOTA: parseFechaLocal y fechasMismoDiaSemana deben estar importados
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
      const errorMsg = err?.message ?? 'Ocurrió un error inesperado. Intentá de nuevo.'
      // NOTA: tituloYMensajeDesdeApi debe estar importado
      const parsed = tituloYMensajeDesdeApi(errorMsg)
      setCancelarReservaId(null)
      setErrorDialog({
        titulo: parsed.mensaje ? parsed.titulo : 'No se pudo cancelar el turno',
        mensaje: parsed.mensaje || errorMsg,
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

      // 1. Crear las reservas fijas 
      const respuesta: any = await crearReservaFijaPresencial(email, detalle.id, fechas)
      toast.success(respuesta.message)

      // 2. Registrar el pago de cada reserva creada
      const reservaIds: number[] = respuesta?.reservaIds ?? []
      if (reservaIds.length > 0) {
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
    <div className="space-y-4">
      {/* Botonera de Pestañas */}
      <div className="flex gap-4 border-b border-neutral-bg pb-2">
        <button 
          onClick={() => setTabActiva('INSCRIPTOS')} 
          className={`text-sm font-semibold transition-colors ${tabActiva === 'INSCRIPTOS' ? 'text-kineblue border-b-2 border-kineblue pb-1' : 'text-neutral-gray hover:text-slate-700'}`}
        >
          Inscriptos
        </button>
        {esAdmin && (
          <button 
            onClick={() => setTabActiva('ESPERA')} 
            className={`text-sm font-semibold transition-colors ${tabActiva === 'ESPERA' ? 'text-kineblue border-b-2 border-kineblue pb-1' : 'text-neutral-gray hover:text-slate-700'}`}
          >
            Lista de espera
          </button>
        )}
      </div>

      {/* Renderizado Condicional de las Pestañas */}
      {tabActiva === 'INSCRIPTOS' && (
        <TabInscriptos 
          detalle={detalle} 
          fecha={fecha} 
          esAdmin={esAdmin} 
          estaLleno={estaLleno} 
          onReservaCreada={onReservaCreada} 
        />
      )}

      {tabActiva === 'ESPERA' && esAdmin && (
        <TabEspera 
          turnoId={detalle.id} 
          onActualizarTurno={async () => {
            if (onReservaCreada) await onReservaCreada()
          }} 
        />
      )}
    </div>
  )
}