'use client'

import { useState } from 'react'
import type { TurnoDetalle, EstadoReserva } from '@/types/turno'
import { registrarPago, type MetodoPagoPresencial } from '@/services/pagosService'

interface TurnoModalProps {
  turno: TurnoDetalle | null
  loading: boolean
  onClose: () => void
}

const ESTADO_RESERVA_BADGE: Record<EstadoReserva, string> = {
  PENDIENTE:  'bg-amber-100 text-amber-700',
  CONFIRMADA: 'bg-kine-blue/15 text-kine-blue-deep',
  ASISTIO:    'bg-progreen/15 text-progreen-deep',
  AUSENTE:    'bg-red-100 text-red-700',
  CANCELADA:  'bg-neutral-bg text-neutral-gray',
}

const ESTADO_RESERVA_LABEL: Record<EstadoReserva, string> = {
  PENDIENTE:  'Pendiente',
  CONFIRMADA: 'Confirmada',
  ASISTIO:    'Asistió',
  AUSENTE:    'Ausente',
  CANCELADA:  'Cancelada',
}

interface FormPago {
  metodo: MetodoPagoPresencial | ''
  error: string
  cargando: boolean
  exito: boolean
}

const FORM_INICIAL: FormPago = { metodo: '', error: '', cargando: false, exito: false }

export default function TurnoModal({ turno, loading, onClose }: TurnoModalProps) {
  const [inscriptoActivo, setInscriptoActivo] = useState<number | null>(null)
  const [form, setForm] = useState<FormPago>(FORM_INICIAL)
  const [pagadosEnSesion, setPagadosEnSesion] = useState<Set<number>>(new Set())

  function abrirFormPago(reservaId: number) {
    setInscriptoActivo(reservaId)
    setForm(FORM_INICIAL)
  }

  function cerrarFormPago() {
    setInscriptoActivo(null)
    setForm(FORM_INICIAL)
  }

  async function handleSubmitPago(reservaId: number) {
    if (!form.metodo) {
      setForm((f) => ({ ...f, error: 'Debe seleccionar un método de pago para continuar.' }))
      return
    }
    setForm((f) => ({ ...f, cargando: true, error: '' }))
    try {
      await registrarPago({ reserva_id: reservaId, metodo: form.metodo as MetodoPagoPresencial })
      setPagadosEnSesion((prev) => new Set(prev).add(reservaId))
      setForm((f) => ({ ...f, cargando: false, exito: true }))
    } catch (e: any) {
      setForm((f) => ({ ...f, cargando: false, error: e.message ?? 'Error al registrar el pago.' }))
    }
  }

  if (!turno && !loading) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-gray hover:text-gray-700"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className="mb-4 text-base font-semibold text-kine-blue">Detalle del turno</h3>

        {loading ? (
          <p className="text-center text-sm text-neutral-gray">Cargando…</p>
        ) : turno ? (
          <div className="space-y-4 text-sm">
            <dl className="space-y-3">
              <div className="flex justify-between border-b border-neutral-bg pb-2">
                <dt className="text-neutral-gray">Horario</dt>
                <dd className="font-medium text-gray-800">{turno.horario}</dd>
              </div>
              <div className="flex justify-between border-b border-neutral-bg pb-2">
                <dt className="text-neutral-gray">Actividad</dt>
                <dd className="font-medium text-gray-800">{turno.actividad}</dd>
              </div>
              <div className="flex justify-between border-b border-neutral-bg pb-2">
                <dt className="text-neutral-gray">Capacidad</dt>
                <dd className="font-medium text-gray-800">{turno.reservasActuales} / {turno.capacidad}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-gray">Espacios libres</dt>
                <dd className={`font-semibold ${turno.espaciosLibres === 0 ? 'text-red-600' : 'text-progreen'}`}>
                  {turno.espaciosLibres}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-gray">
                Inscriptos
              </h4>
              {turno.inscriptos.length === 0 ? (
                <p className="text-neutral-gray">Sin inscriptos</p>
              ) : (
                <ul className="space-y-2">
                  {turno.inscriptos.map((p) => (
                    <li key={p.id} className="rounded-lg border border-neutral-bg bg-neutral-bg/30">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="font-medium text-gray-800">{p.nombre} {p.apellido}</span>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_RESERVA_BADGE[p.estado]}`}>
                            {ESTADO_RESERVA_LABEL[p.estado]}
                          </span>
                          {!(p.pagado || pagadosEnSesion.has(p.id)) && inscriptoActivo !== p.id && (
                            <button
                              onClick={() => abrirFormPago(p.id)}
                              className="rounded-lg bg-kine-blue px-2 py-0.5 text-xs font-medium text-white hover:bg-kine-blue-deep transition-colors"
                            >
                              Registrar pago
                            </button>
                          )}
                          {(p.pagado || pagadosEnSesion.has(p.id)) && (
                            <span className="rounded-full bg-pro-green/15 px-2 py-0.5 text-xs font-medium text-pro-green-deep">
                              Pagado
                            </span>
                          )}
                        </div>
                      </div>

                      {inscriptoActivo === p.id && (
                        <div className="border-t border-neutral-bg px-3 pb-3 pt-2 space-y-2">
                          {form.exito ? (
                            <p className="text-center text-xs font-medium text-progreen">
                              Pago registrado correctamente
                            </p>
                          ) : (
                            <>
                              <p className="text-xs font-medium text-neutral-gray mb-1">Método de pago</p>
                              <div className="flex gap-2">
                                {(['EFECTIVO', 'TARJETA'] as MetodoPagoPresencial[]).map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => setForm((f) => ({ ...f, metodo: m, error: '' }))}
                                    className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                                      form.metodo === m
                                        ? 'border-kine-blue bg-kine-blue/10 text-kine-blue'
                                        : 'border-neutral-bg text-neutral-gray hover:border-kine-blue/50'
                                    }`}
                                  >
                                    {m === 'EFECTIVO' ? 'Efectivo' : 'Posnet'}
                                  </button>
                                ))}
                              </div>

                              {form.error && (
                                <p className="text-xs text-red-600">{form.error}</p>
                              )}

                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleSubmitPago(p.id)}
                                  disabled={form.cargando}
                                  className="flex-1 rounded-lg bg-kine-blue py-1.5 text-xs font-semibold text-white hover:bg-kine-blue-deep disabled:opacity-50 transition-colors"
                                >
                                  {form.cargando ? 'Registrando…' : 'Confirmar'}
                                </button>
                                <button
                                  onClick={cerrarFormPago}
                                  className="flex-1 rounded-lg border border-neutral-bg py-1.5 text-xs font-medium text-neutral-gray hover:bg-neutral-bg transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
