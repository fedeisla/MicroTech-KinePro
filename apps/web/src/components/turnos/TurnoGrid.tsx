'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChevronDown } from 'lucide-react'
import type { TurnoResumen, TurnoDetalle, EstadoTurno } from '@/types/turno'
import { getTurnoById } from '@/services/turnosService'
import TabInscriptos from './TabInscriptos'
import TabEspera from './TabEspera'



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
  const [tabActiva, setTabActiva] = useState<'INSCRIPTOS' | 'ESPERA'>('INSCRIPTOS')

  return (
    <div className="space-y-4">
      {/* --- BOTONERA DE TABS --- */}
      {esAdmin && (
        <div className="flex border-b border-light-bg-gray mb-2">
          <button
            onClick={() => setTabActiva('INSCRIPTOS')}
            className={`px-4 py-2 text-sm font-semibold tracking-wide border-b-2 transition-colors ${
              tabActiva === 'INSCRIPTOS' 
                ? 'border-kineblue text-kineblue' 
                : 'border-transparent text-neutral-gray hover:text-text-main'
            }`}
          >
            INSCRIPTOS ({detalle.reservasActuales}/{detalle.capacidad})
          </button>
          <button
            onClick={() => setTabActiva('ESPERA')}
            className={`px-4 py-2 text-sm font-semibold tracking-wide border-b-2 transition-colors flex items-center gap-2 ${
              tabActiva === 'ESPERA' 
                ? 'border-progreen text-progreen-deep' 
                : 'border-transparent text-neutral-gray hover:text-text-main'
            }`}
          >
            LISTA DE ESPERA
          </button>
        </div>
      )}

      {/* --- CONTENIDO DE LA PESTAÑA: INSCRIPTOS --- */}
      {tabActiva === 'INSCRIPTOS' && (
        <TabInscriptos 
          detalle={detalle} 
          fecha={fecha} 
          esAdmin={esAdmin} 
          onReservaCreada={onReservaCreada} 
        />
      )}

      {/* --- CONTENIDO DE LA PESTAÑA: ESPERA --- */}
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
