'use client'

import { CalendarCheck, Check, X } from 'lucide-react'
import type { TurnoPacientePasado } from '@/types/turnoPaciente'

function formatFecha(fecha: string): string {
  const [year, month, day] = fecha.split('-')
  return `${day}/${month}/${year}`
}

interface ListaTurnosPasadosProps {
  turnos: TurnoPacientePasado[]
}

export default function ListaTurnosPasados({ turnos }: ListaTurnosPasadosProps) {
  if (turnos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
        <p className="text-sm font-medium text-slate-600">No posee turnos pasados o cancelados</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {turnos.map((turno) => (
        <li
          key={turno.id}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{turno.actividad}</p>
                <p className="text-sm text-slate-500">
                  {formatFecha(turno.fecha)} · {turno.hora} hs
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                turno.asistio ? 'border-kine-blue bg-kine-blue/10' : 'border-kine-blue/30 bg-kine-blue/5'
              }`}
              role="group"
              aria-label="Estado del turno"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  turno.asistio
                    ? 'border-kine-blue bg-kine-blue/15 text-kine-blue-deep'
                    : 'border-kine-blue bg-kine-blue/10 text-kine-blue-deep'
                }`}
              >
                {turno.estado === 'CANCELADA' ? (
                  <X className="h-2.5 w-2.5 stroke-[3]" />
                ) : (
                  turno.asistio && <Check className="h-2.5 w-2.5 stroke-[3]" />
                )}
              </span>
              <span
                className={`font-medium ${turno.asistio ? 'text-kine-blue-deep' : 'text-kine-blue'}`}
              >
                {turno.estado === 'CANCELADA' ? 'Cancelado' : turno.asistio ? 'Asistió' : 'Ausente'}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
