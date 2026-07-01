'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  crearReservaPresencial,
  crearReservaFijaPresencial,
  cancelarReservaPresencial,
  chequearDescuento,
} from '@/services/reservasService'
import { registrarPago } from '@/services/pagosService'
import { obtenerPacientes } from '@/services/usuariosService'
import { listaEsperaService } from '@/services/listaEsperaService' // El servicio que actualizamos recién
import { fechasMismoDiaSemana, parseFechaLocal } from '@/lib/fechas'
import ReprogramarReservaModal from '@/components/turnos/ReprogramarReservaModal'
import InfoDialog, { tituloYMensajeDesdeApi } from '@/app/Components/InfoDialog'
import type { TurnoDetalle } from '@/types/turno'

interface TabInscriptosProps {
  detalle: TurnoDetalle
  fecha: string | null
  esAdmin: boolean
  onReservaCreada?: () => Promise<void>
}

export default function TabInscriptos({ detalle, fecha, esAdmin, onReservaCreada }: TabInscriptosProps) {
  const [email, setEmail] = useState('')
  const [tipoReserva, setTipoReserva] = useState<'unico' | 'fijo'>('unico')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(false)
  const [reprogramarReservaId, setReprogramarReservaId] = useState<number | null>(null)
  const [cancelarReservaId, setCancelarReservaId] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | ''>('')
  const [pacientes, setPacientes] = useState<any[]>([])
  const [aplicaDescuento, setAplicaDescuento] = useState(false)
  const [errorDialog, setErrorDialog] = useState<{ titulo: string; mensaje: string } | null>(null)

  // NUEVOS ESTADOS PARA LA LISTA DE ESPERA CONDICIONAL
  const [prioridadEspera, setPrioridadEspera] = useState<number>(2) // 2 = Por Demanda por defecto
  const esTurnoLleno = Number(detalle.reservasActuales) >= Number(detalle.capacidad)

  useEffect(() => {
    if (!esAdmin) return
    obtenerPacientes()
      .then(setPacientes)
      .catch((err) => toast.error('Error cargando pacientes', { description: err.message }))
  }, [esAdmin])

  useEffect(() => {
    if (tipoReserva !== 'fijo' || !email) {
      setAplicaDescuento(false)
      return
    }
    chequearDescuento(email).then((res) => setAplicaDescuento(res.aplica)).catch(() => setAplicaDescuento(false))
  }, [email, tipoReserva])

  const calcularFechasFixas = (fechaInicio: string, fechaFinStr: string) => {
    const inicio = parseFechaLocal(fechaInicio)
    const fin = parseFechaLocal(fechaFinStr)
    return fin < inicio ? [] : fechasMismoDiaSemana(inicio, fin)
  }

  // FUNCIÓN PARA ENVIAR EL PACIENTE A LA LISTA DE ESPERA (TURNO LLENO)
  const handleAgregarAListaEspera = async () => {
    if (!email) return toast.error('Seleccione un paciente')
    
    setLoading(true)
    try {
      await listaEsperaService.inscribirAdmin(email, detalle.id, prioridadEspera)
      toast.success('Paciente ingresado a la lista de espera con éxito')
      setEmail('')
      if (onReservaCreada) await onReservaCreada() // Refresca las pestañas y contadores
    } catch (err: any) {
      toast.error('No se pudo agregar al paciente', { 
        description: err.message || 'La capacidad máxima de la lista está completa.' 
      })
    } finally {
      setLoading(false)
    }
  }

  // FUNCIONES DE RESERVA NORMAL (TURNO CON LUGARES LIBRES)
  const handleReservarPorEmail = async () => {
    try {
      if (!email) return toast.error('Seleccione un paciente')
      if (!metodoPago) return toast.error('Debe seleccionar un método de pago para continuar')
      setLoading(true)

      const resReserva: any = await crearReservaPresencial(email, detalle.id)
      const reservaId = resReserva?.reservaId ?? resReserva?.id

      if (!reservaId) {
        toast.success('Reserva registrada con éxito')
        setEmail(''); setMetodoPago('');
        if (onReservaCreada) await onReservaCreada()
        return
      }

      try {
        await registrarPago({ reserva_id: reservaId, metodo: metodoPago as 'EFECTIVO' | 'TARJETA' })
        toast.success('Pago registrado con éxito')
      } catch (pagoErr: any) {
        toast.error('No se pudo registrar el pago', { description: pagoErr.message })
      }

      setEmail(''); setMetodoPago('');
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
        const montoPorReserva = aplicaDescuento ? precioUnitario * 0.8 : precioUnitario
      
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

      setEmail(''); setMetodoPago(''); setFechaFin('');
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

  if (detalle.inscriptos.length === 0 && !esAdmin) {
    return <p className="text-xs text-neutral-gray">Sin inscriptos en este turno.</p>
  }

  return (
    <div className="space-y-2">
      {/* Lista de pacientes inscriptos en el turno */}
      {detalle.inscriptos.map((p) => (
        <div key={p.id} className="rounded-lg border border-light-bg-gray bg-pure-white px-3 py-2 flex items-center justify-between gap-2 shadow-sm">
          <span className="text-sm font-medium text-text-main">
            {p.nombre} {p.apellido}
            {p.email && <span className="text-neutral-gray font-normal text-xs"> ({p.email})</span>}
          </span>
          {esAdmin && p.estado !== 'CANCELADA' && (
            <div className="flex gap-2 shrink-0">
              <button type="button" onClick={() => setReprogramarReservaId(p.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-kineblue-light/50 text-kineblue hover:bg-kineblue/5 transition-colors">
                Reprogramar
              </button>
              <button type="button" onClick={() => setCancelarReservaId(p.id)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors">
                Cancelar turno
              </button>
            </div>
          )}
        </div>
      ))}

      {/* SECCIÓN DE ENTRADA DE DATOS DEL ADMINISTRADOR */}
      {esAdmin && (
        <div className="mt-4 border-t border-light-bg-gray pt-4">
          
          {esTurnoLleno ? (
            /* VISTA: FORMULARIO CUANDO EL TURNO YA ESTÁ LLENO */
            <div className="bg-light-bg-gray/60 border border-kineblue-light/30 p-4 rounded-xl space-y-3">
              <p className="text-sm font-bold text-kineblue-deep">
                ¿Quiere ingresar un paciente a la lista de espera?
              </p>
              
              <div>
                <label className="text-xs font-semibold text-neutral-gray mb-1 block">Paciente</label>
                <select
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-light-bg-gray rounded-md text-sm bg-pure-white text-text-main focus:outline-none focus:border-kineblue"
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.email}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-5 py-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-text-main cursor-pointer">
                  <input 
                    type="radio" 
                    name="prioridadEspera" 
                    checked={prioridadEspera === 1} 
                    onChange={() => setPrioridadEspera(1)} 
                    className="text-kineblue focus:ring-kineblue"
                  />
                  Turno fijo [Prioridad 1]
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-text-main cursor-pointer">
                  <input 
                    type="radio" 
                    name="prioridadEspera" 
                    checked={prioridadEspera === 2} 
                    onChange={() => setPrioridadEspera(2)} 
                    className="text-kineblue focus:ring-kineblue"
                  />
                  Por demanda [Prioridad 2]
                </label>
              </div>

              <button 
                disabled={loading} 
                onClick={handleAgregarAListaEspera} 
                className="w-full px-3 py-2 rounded-md bg-progreen text-pure-white text-sm font-semibold hover:bg-progreen-deep transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Agregar a la lista'}
              </button>
            </div>
          ) : (
            /* VISTA: FORMULARIO NORMAL CON CUPOS DISPONIBLES */
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-main mb-1 block">Anotar paciente</label>
              <select
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border border-light-bg-gray rounded-md text-sm bg-pure-white text-text-main"
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
                className="w-full p-2 border border-light-bg-gray rounded-md text-sm bg-pure-white text-text-main"
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
                    <div className="mt-2 text-xs text-neutral-gray">
                      Monto a abonar: <span className="font-bold text-text-main">${formatear(precioUnitario)}</span>
                    </div>
                  )
                }
                let cantidadTurnos = 0
                if (fecha && fechaFin) cantidadTurnos = calcularFechasFixas(fecha, fechaFin).length
                const subtotal = precioUnitario * cantidadTurnos
                const descuento = aplicaDescuento ? subtotal * 0.2 : 0
                const total = subtotal - descuento
              
                return (
                  <div className="mt-2 text-xs p-3 bg-light-bg-gray rounded-md border border-neutral-gray/20 text-neutral-gray space-y-1">
                    {cantidadTurnos > 0 ? (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-medium text-text-main">${formatear(subtotal)}</span>
                        </div>
                        {aplicaDescuento && <div className="text-progreen-deep">Descuento 20%: -${formatear(descuento)}</div>}
                        <div className="flex justify-between pt-1 border-t border-neutral-gray/20 mt-1">
                          <span className="font-semibold text-text-main">Total a cobrar:</span>
                          <span className="font-bold text-kineblue-deep">${formatear(total)}</span>
                        </div>
                      </>
                    ) : (
                      <span className="text-neutral-gray italic">Ingresá una fecha de fin para calcular el total.</span>
                    )}
                  </div>
                )
              })()}

              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer text-text-main">
                  <input type="radio" name="tipo" value="unico" checked={tipoReserva === 'unico'} onChange={() => setTipoReserva('unico')} />
                  Turno único
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer text-text-main">
                  <input type="radio" name="tipo" value="fijo" checked={tipoReserva === 'fijo'} onChange={() => setTipoReserva('fijo')} />
                  Turnos fijos
                </label>
              </div>

              {tipoReserva === 'unico' ? (
                <button disabled={loading} onClick={handleReservarPorEmail} className="w-full mt-2 px-3 py-2 rounded-md bg-kine-blue text-pure-white text-sm font-medium hover:bg-kine-blue-deep transition-colors">
                  Anotar Paciente
                </button>
              ) : (
                <div className="mt-2 space-y-2">
                  <label className="text-xs text-neutral-gray block">Fecha de fin (YYYY-MM-DD)</label>
                  <input value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} type="date" className="w-full p-2 border border-light-bg-gray rounded-md text-sm text-text-main" />
                  <button disabled={loading} onClick={handleReservarFijosPorEmail} className="w-full px-3 py-2 rounded-md bg-kine-blue text-pure-white text-sm font-medium hover:bg-kine-blue-deep transition-colors">
                    Anotar turnos fijos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modales y Diálogos */}
      <ReprogramarReservaModal abierto={reprogramarReservaId !== null} reservaId={reprogramarReservaId} fechaActual={fecha} tipoActividadId={detalle.tipoActividadId ?? null} actividadNombre={detalle.actividad} presencial onClose={() => setReprogramarReservaId(null)} onReprogramado={async () => { setReprogramarReservaId(null); if (onReservaCreada) await onReservaCreada() }} />
      {cancelarReservaId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !cancelando && setCancelarReservaId(null)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-pure-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-main">Cancelar turno</h3>
            <p className="mt-1 text-sm text-neutral-gray">¿Confirmás que querés cancelar este turno del paciente?</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={cancelando} onClick={() => setCancelarReservaId(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-gray hover:bg-light-bg-gray disabled:opacity-50">Volver</button>
              <button type="button" disabled={cancelando} onClick={handleCancelarConfirmado} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-pure-white hover:bg-red-700 disabled:opacity-50">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      <InfoDialog abierto={errorDialog !== null} variante="error" titulo={errorDialog?.titulo ?? ''} mensaje={errorDialog?.mensaje} onCerrar={() => setErrorDialog(null)} />
    </div>
  )
}