'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import TurnoGrid from '@/components/turnos/TurnoGrid'
import { getTurnosByFecha, getReservasMes } from '@/services/turnosService'
import type { TurnoResumen, TurnoEventoMes } from '@/types/turno'
import CrearTurnoModal from '@/components/turnos/CrearTurnoModal'
import { Plus } from 'lucide-react'
import { useRequireRole } from '@/hooks/useAuth'

function obtenerFechaHoy(): string {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// FullCalendar no soporta SSR → carga dinámica solo en cliente
const CalendarioTurnos = dynamic(() => import('@/components/turnos/CalendarioTurnos'), { ssr: false })

export default function TurnosPage() {
  const { autorizado, cargando } = useRequireRole(['ADMIN', 'OWNER'])

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(obtenerFechaHoy())
  const [turnos, setTurnos] = useState<TurnoResumen[]>([])
  const [loadingTurnos, setLoadingTurnos] = useState(false)
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [eventosCalendario, setEventosCalendario] = useState<TurnoEventoMes[]>([])

  async function cargarEventosMes(mes: number, anio: number) {
    try {
      const data = await getReservasMes(mes, anio)
      setEventosCalendario(data)
    } catch {
      setEventosCalendario([])
    }
  }

  async function handleFechaSelect(fecha: string) {
    setFechaSeleccionada(fecha)
    setTurnos([])
    setLoadingTurnos(true)
    try {
      const data = await getTurnosByFecha(fecha)
      setTurnos(data)
    } finally {
      setLoadingTurnos(false)
    }
  }

  useEffect(() => {
    if (fechaSeleccionada) void handleFechaSelect(fechaSeleccionada)
    const hoy = new Date()
    void cargarEventosMes(hoy.getMonth() + 1, hoy.getFullYear())
  }, [])

  if (cargando) return <p className="p-6 text-slate-500">Cargando...</p>
  if (!autorizado) return null

  return (
    <main className="min-h-screen bg-neutral-bg/40 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-kineblue">Turnos</h1>
          <button
            onClick={() => setModalCrearAbierto(true)}
            className="bg-kine-blue hover:bg-kine-blue-deep text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear turno
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section>
            <CalendarioTurnos
              fechaSeleccionada={fechaSeleccionada}
              onFechaSelect={handleFechaSelect}
              eventos={eventosCalendario}
              onMesChange={cargarEventosMes}
            />
          </section>

          <section className="flex flex-col gap-4">
            <TurnoGrid
              fecha={fechaSeleccionada}
              turnos={turnos}
              loading={loadingTurnos}
              onTurnosActualizados={() => {
                if (fechaSeleccionada) void handleFechaSelect(fechaSeleccionada)
                const hoy = new Date()
                void cargarEventosMes(hoy.getMonth() + 1, hoy.getFullYear())
              }}
            />
          </section>
        </div>
      </div>

      <CrearTurnoModal
        abierto={modalCrearAbierto}
        fechaInicial={fechaSeleccionada}
        onClose={() => setModalCrearAbierto(false)}
        onCreado={() => {
          if (fechaSeleccionada) handleFechaSelect(fechaSeleccionada)
        }}
      />
    </main>
  )
}
