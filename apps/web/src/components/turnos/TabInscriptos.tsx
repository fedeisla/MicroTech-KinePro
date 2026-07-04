'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { parseFechaLocal, fechasMismoDiaSemana } from '@/lib/fechas'
import {
  crearReservaPresencial,
  crearReservaFijaPresencial,
  cancelarReservaPresencial,
  chequearDescuento,
} from '@/services/reservasService'
import { registrarPago } from '@/services/pagosService'
import { obtenerPacientes } from '@/services/usuariosService'
import { listaEsperaService } from '@/services/listaEsperaService'
import ReprogramarReservaModal from '@/components/turnos/ReprogramarReservaModal'
import InfoDialog, { tituloYMensajeDesdeApi } from '@/app/Components/InfoDialog'
import type { TurnoDetalle } from '@/types/turno'

interface TabInscriptosProps {
  detalle: TurnoDetalle
  fecha: string | null
  esAdmin: boolean
  estaLleno?: boolean
  onReservaCreada?: () => Promise<void>
}

interface PacienteOption {
  id: number
  email: string
  nombre: string
  apellido: string
}

export default function TabInscriptos({ detalle, fecha, esAdmin, estaLleno = false, onReservaCreada }: TabInscriptosProps) {
  // Estados para el formulario de inscripción
  const [email, setEmail] = useState('')
  const [tipoReserva, setTipoReserva] = useState<'unico' | 'fijo'>('unico')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | ''>('')
  const [pacientes, setPacientes] = useState<PacienteOption[]>([])
  const [aplicaDescuento, setAplicaDescuento] = useState(false)
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0)
  const [prioridadEspera, setPrioridadEspera] = useState<number>(2) 

  // Estados para cancelar/reprogramar
  const [reprogramarReservaId, setReprogramarReservaId] = useState<number | null>(null)
  const [cancelarReservaId, setCancelarReservaId] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ titulo: string; mensaje: string } | null>(null)

  useEffect(() => {
    if (!esAdmin) return
    obtenerPacientes()
      .then(setPacientes)
      .catch((err) => toast.error('Error cargando pacientes', { description: err.message }))
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

  const calcularFechasFixas = (fechaInicio: string, fechaFinStr: string) => {
    const inicio = parseFechaLocal(fechaInicio)
    const fin = parseFechaLocal(fechaFinStr)
    return fin < inicio ? [] : fechasMismoDiaSemana(inicio, fin)
  }

  const handleAgregarAListaEspera = async () => {
    if (!email) return toast.error('Seleccione un paciente')
    
    setLoading(true)
    try {
      await listaEsperaService.inscribirAdmin(email, detalle.id, prioridadEspera)
      toast.success('Paciente ingresado a la lista de espera con éxito')
      setEmail('')
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudo agregar al paciente', { 
        description: err.message || 'La capacidad máxima de la lista está completa.' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReservarPorEmail = async () => {
    try {
      if (!email) return toast.error('Seleccione un paciente')
      if (!metodoPago) return toast.error('Debe seleccionar un método de pago para continuar')
      setLoading(true)

      const resReserva: any = await crearReservaPresencial(email, detalle.id)
      const reservaId = resReserva?.reservaId ?? resReserva?.id

      if (!reservaId) {
        toast.success('Reserva registrada con éxito')
        setEmail('')
        setMetodoPago('')
        if (onReservaCreada) await onReservaCreada()
        return
      }

      try {
        await registrarPago({ reserva_id: reservaId, metodo: metodoPago as 'EFECTIVO' | 'TARJETA' })
        toast.success('Pago registrado con éxito')
      } catch (pagoErr: any) {
        toast.error('No se pudo registrar el pago', { description: pagoErr.message })
      }

      setEmail('')
      setMetodoPago('')
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudo crear la reserva', { description: err.message })
    } finally {
      setLoading(false)
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
      if (fechas.length === 0) return toast.error('La fecha de fin debe ser posterior')

      const respuesta: any = await crearReservaFijaPresencial(email, detalle.id, fechas)
      toast.success(respuesta.message)

      const reservaIds: number[] = respuesta?.reservaIds ?? []
      if (reservaIds.length > 0) {
        const precioUnitario = detalle.precio ?? 0
        const factorDescuento = aplicaDescuento ? (100 - porcentajeDescuento) / 100 : 1
        const montoPorReserva = precioUnitario * factorDescuento
      
        for (const rid of reservaIds) {
          try {
            await registrarPago({
              reserva_id: rid,
              metodo: metodoPago as 'EFECTIVO' | 'TARJETA',
              monto: montoPorReserva,
            })
          } catch (e) {}
        }
      }

      setEmail('')
      setMetodoPago('')
      setFechaFin('')
      if (onReservaCreada) await onReservaCreada()
    } catch (err: any) {
      toast.error('No se pudieron crear las reservas', { description: err.message })
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
      const detalleMsg = err?.message ?? 'Ocurrió un error inesperado.'
      const parsed = tituloYMensajeDesdeApi(detalleMsg)
      setCancelarReservaId(null)
      setErrorDialog({
        titulo: parsed.mensaje ? parsed.titulo : 'No se pudo cancelar el turno',
        mensaje: parsed.mensaje || detalleMsg,
      })
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* FORMULARIO DE ADMINISTRADOR (ARRIBA) */}
      {esAdmin && (
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 mb-4 shadow-sm">
          {estaLleno ? (
            /* --- VISTA: TURNO LLENO (LISTA DE ESPERA) --- */
            <>
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-xs mb-3 font-medium">
                El turno está completo. El paciente será anotado directamente en la <strong>Lista de Espera</strong>.
              </div>
              
              <label className="text-xs text-slate-600 mb-1 block">Paciente</label>
              <select
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white"
              >
                <option value="">Seleccionar paciente </option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.email}>{p.nombre} {p.apellido}</option>
                ))}
              </select>

              <div className="flex gap-5 py-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="radio" name="prioridadEspera" checked={prioridadEspera === 1} onChange={() => setPrioridadEspera(1)} />
                  Turno fijo 
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="radio" name="prioridadEspera" checked={prioridadEspera === 2} onChange={() => setPrioridadEspera(2)} />
                  Por demanda 
                </label>
              </div>

              <button disabled={loading} onClick={handleAgregarAListaEspera} className="w-full px-3 py-2 rounded-md bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
                {loading ? 'Ingresando...' : 'Agregar a Lista de Espera'}
              </button>
            </>
          ) : (
            /* --- VISTA: TURNO CON LUGAR (RESERVA NORMAL) --- */
            <>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Anotar paciente</label>
              <select value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">Seleccionar paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.email}>{p.nombre} {p.apellido}</option>
                ))}
              </select>
              
              <label className="text-xs text-slate-600 mb-1 block mt-2">Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as 'EFECTIVO' | 'TARJETA' | '')} className="w-full p-2 border border-slate-200 rounded-md text-sm bg-white">
                <option value="">Seleccionar método</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Posnet</option>
              </select>
              
              {/* Desglose de precios dinámico */}
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
                          <div className="text-amber-700 mt-1">El paciente no califica para descuento.</div>
                        )}
                      </>
                    ) : (
                      <>Monto total a abonar: <span className="font-bold text-slate-800">$-</span> <span className="text-slate-400">(ingresá fecha de fin)</span></>
                    )}
                  </div>
                )
              })()}

              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
                  <input type="radio" name="tipo" value="unico" checked={tipoReserva === 'unico'} onChange={() => setTipoReserva('unico')} />
                  Turno único
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-700">
                  <input type="radio" name="tipo" value="fijo" checked={tipoReserva === 'fijo'} onChange={() => setTipoReserva('fijo')} />
                  Turnos fijos
                </label>
              </div>

              {tipoReserva === 'unico' ? (
                <button disabled={loading} onClick={handleReservarPorEmail} className="w-full mt-2 px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors">
                  Anotar Paciente
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <label className="text-xs text-slate-500 block">Fecha de fin (YYYY-MM-DD)</label>
                  <input value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} type="date" className="w-full p-2 border border-slate-200 rounded-md text-sm" />
                  <button disabled={loading} onClick={handleReservarFijosPorEmail} className="w-full px-3 py-2 rounded-md bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors">
                    Anotar turnos fijos
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* LISTA DE PACIENTES YA INSCRIPTOS (ABAJO) */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pacientes Anotados</h4>
        {detalle.inscriptos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin inscriptos en este turno.</p>
        ) : (
          detalle.inscriptos.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
              <span className="text-sm font-medium text-slate-800">
                {p.nombre} {p.apellido}
                {p.email && <span className="text-slate-500 font-normal text-xs"> ({p.email})</span>}
              </span>
              {esAdmin && p.estado !== 'CANCELADA' && (
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => setReprogramarReservaId(p.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Reprogramar
                  </button>
                  <button type="button" onClick={() => setCancelarReservaId(p.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modales y Diálogos */}
      <ReprogramarReservaModal abierto={reprogramarReservaId !== null} reservaId={reprogramarReservaId} fechaActual={fecha} tipoActividadId={detalle.tipoActividadId ?? null} actividadNombre={detalle.actividad} presencial onClose={() => setReprogramarReservaId(null)} onReprogramado={async () => { setReprogramarReservaId(null); if (onReservaCreada) await onReservaCreada() }} />
      
      {cancelarReservaId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !cancelando && setCancelarReservaId(null)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Cancelar turno</h3>
            <p className="mt-1 text-sm text-slate-500">¿Confirmás que querés cancelar este turno del paciente?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={cancelando} onClick={() => setCancelarReservaId(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">Volver</button>
              <button type="button" disabled={cancelando} onClick={handleCancelarConfirmado} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <InfoDialog abierto={errorDialog !== null} variante="error" titulo={errorDialog?.titulo ?? ''} mensaje={errorDialog?.mensaje} onCerrar={() => setErrorDialog(null)} />
    </div>
  )
}