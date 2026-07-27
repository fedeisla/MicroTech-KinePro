'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { DatesSetArg } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import type { TurnoEventoMes, TurnoResumen } from '@/types/turno'
import { getTurnosByFecha } from '@/services/turnosService'

interface CalendarioTurnosProps {
  fechaSeleccionada: string | null
  onFechaSelect: (fecha: string) => void
  eventos: TurnoEventoMes[]
  onMesChange: (mes: number, anio: number) => void
}

interface TooltipState {
  left: number
  top: number
  turnos: TurnoResumen[]
}

function obtenerFechaHoy(): string {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function computeDayStatus(eventos: TurnoEventoMes[]): Record<string, 'blue'> {
  const byDay: Record<string, { total: number }> = {}
  for (const e of eventos) {
    if (!byDay[e.date]) byDay[e.date] = { total: 0 }
    byDay[e.date].total += e.total_reservas
  }
  const result: Record<string, 'blue'> = {}
  for (const [date, { total }] of Object.entries(byDay)) {
    if (total > 0) result[date] = 'blue'
  }
  return result
}

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function CalendarioTurnos({ fechaSeleccionada, onFechaSelect, eventos, onMesChange }: CalendarioTurnosProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fechaHoy = obtenerFechaHoy()

  const dayStatus = useMemo(() => computeDayStatus(eventos), [eventos])
  const dayStatusRef = useRef(dayStatus)
  useEffect(() => { dayStatusRef.current = dayStatus }, [dayStatus])

  // FullCalendar no re-corre dayCellClassNames en celdas ya montadas cuando
  // cambia el estado de React, así que actualizamos las clases directo en el DOM.
  useEffect(() => {
    const container = wrapperRef.current
    if (!container) return
    container.querySelectorAll<HTMLElement>('.fc-daygrid-day[data-date]').forEach((cell) => {
      const date = cell.dataset.date!
      cell.classList.remove('fc-day-has-pagos', 'fc-day-all-paid', 'fc-day-has-pending')
      const status = dayStatus[date]
      if (status) {
        cell.classList.add('fc-day-has-pagos')
      }
    })
  }, [dayStatus])

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const setTooltipRef = useRef(setTooltip)
  const pendingFetchRef = useRef<string | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpiar tooltip al cambiar de mes
  useEffect(() => { setTooltip(null) }, [eventos])

  function handleDateClick(arg: DateClickArg) {
    onFechaSelect(arg.dateStr)
  }

  function handleTodayClick() {
    calendarRef.current?.getApi().today()
    onFechaSelect(fechaHoy)
  }

  function handleDatesSet(arg: DatesSetArg) {
    const mid = new Date((arg.start.getTime() + arg.end.getTime()) / 2)
    onMesChange(mid.getMonth() + 1, mid.getFullYear())
  }

  function handleTooltipMouseEnter() {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
  }

  function handleTooltipMouseLeave() {
    setTooltip(null)
  }

  return (
    <>
      <div ref={wrapperRef} className="rounded-xl border border-neutral-bg bg-white p-4 shadow-sm">
        <style>{`
          .fc-button-primary {
            background-color: #005C9C !important;
            border-color: #005C9C !important;
          }
          .fc-button-primary:hover {
            background-color: #002D4C !important;
            border-color: #002D4C !important;
          }
          .fc-day-today {
            background-color: rgba(41, 182, 182, 0.1) !important;
          }
          .fc-daygrid-day[data-date="${fechaSeleccionada}"] {
            background-color: rgba(0, 92, 156, 0.12) !important;
          }
          .fc-daygrid-day[data-date="${fechaSeleccionada}"] .fc-daygrid-day-number {
            color: #005C9C;
            font-weight: 700;
          }
          .fc-col-header-cell {
            background-color: #F1F1F1;
          }
          .fc-day-has-pagos .fc-daygrid-day-number {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .fc-day-has-pagos .fc-daygrid-day-number::after {
            content: '';
            display: inline-block;
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
            background-color: #005C9C;
          }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          initialDate={fechaSeleccionada ?? fechaHoy}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          headerToolbar={{
            left: 'prev,next customToday',
            center: 'title',
            right: '',
          }}
          customButtons={{
            customToday: {
              text: 'Hoy',
              click: handleTodayClick,
            },
          }}
          height="auto"
          selectable={false}
          dayCellClassNames={(arg) => {
            const status = dayStatusRef.current[toDateStr(arg.date)]
            if (!status) return []
            return ['fc-day-has-pagos']
          }}
          dayCellDidMount={(arg) => {
            const dateStr = toDateStr(arg.date)

            arg.el.addEventListener('mouseenter', async () => {
              if (!dayStatusRef.current[dateStr]) return

              if (leaveTimeoutRef.current) {
                clearTimeout(leaveTimeoutRef.current)
                leaveTimeoutRef.current = null
              }

              pendingFetchRef.current = dateStr

              let turnos: TurnoResumen[]
              try {
                const data = await getTurnosByFecha(dateStr)
                turnos = data.filter((t) => t.espaciosLibres > 0)
              } catch {
                return
              }

              if (pendingFetchRef.current !== dateStr || turnos.length === 0) return

              const rect = arg.el.getBoundingClientRect()
              const tooltipWidth = 248
              const left = Math.min(rect.left, window.innerWidth - tooltipWidth - 12)

              setTooltipRef.current({ left, top: rect.bottom + 4, turnos })
            })

            arg.el.addEventListener('mouseleave', () => {
              pendingFetchRef.current = null
              leaveTimeoutRef.current = setTimeout(() => {
                setTooltipRef.current(null)
              }, 120)
            })
          }}
        />
      </div>

      {tooltip &&
        createPortal(
          <TooltipCupos
            tooltip={tooltip}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          />,
          document.body,
        )}
    </>
  )
}

function TooltipCupos({
  tooltip,
  onMouseEnter,
  onMouseLeave,
}: {
  tooltip: TooltipState
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  // Agrupar por horario (puede haber varias actividades a la misma hora)
  const byHorario = useMemo(() => {
    const map = new Map<string, TurnoResumen[]>()
    for (const t of tooltip.turnos) {
      const list = map.get(t.horario) ?? []
      list.push(t)
      map.set(t.horario, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [tooltip.turnos])

  return (
    <div
      style={{ position: 'fixed', left: tooltip.left, top: tooltip.top, zIndex: 9999, width: 248 }}
      className="rounded-xl border border-neutral-200 bg-white shadow-lg py-2.5 px-3"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
        Turnos con cupo
      </p>
      <div className="flex flex-col gap-2">
        {byHorario.map(([horario, turnos]) => (
          <div key={horario}>
            <span className="text-xs font-bold text-kineblue">{horario}</span>
            <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
              {turnos.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 truncate">{t.actividad}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {t.espaciosLibres} libre{t.espaciosLibres !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
