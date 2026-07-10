'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, AlertCircle, Filter } from 'lucide-react'
import TablaGenerica, { Columna } from '@/app/Components/TablaGenerica'
import FiltrarPacienteModal from '@/components/pagos/FiltrarPacienteModal'
import { obtenerHistorialPagos } from '@/services/pagosService'
import type { PagoHistorial, EstadoPago } from '@/types/pago'

const LIMITE_HISTORIAL = 20

const ESTADO_LABELS: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado',
  REEMBOLSADO: 'Reembolsado',
}

const ESTADO_STYLES: Record<EstadoPago, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-100',
  COMPLETADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  RECHAZADO: 'bg-red-50 text-red-700 border-red-100',
  REEMBOLSADO: 'bg-slate-100 text-slate-600 border-slate-200',
}

function formatearFechaPago(iso: string | null): string {
  if (!iso) return '—'
  const fecha = new Date(iso)
  const day = String(fecha.getDate()).padStart(2, '0')
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const year = fecha.getFullYear()
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto)
}

export default function TablaHistorialPagos() {
  const [pagos, setPagos] = useState<PagoHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalFiltroAbierto, setModalFiltroAbierto] = useState(false)
  const [pacienteFiltroId, setPacienteFiltroId] = useState<number | null>(null)
  const [pacienteFiltroNombre, setPacienteFiltroNombre] = useState<string | null>(null)

  const cargar = useCallback(async (pacienteId: number | null = null) => {
    setCargando(true)
    setError(null)
    try {
      const data = await obtenerHistorialPagos(
        pacienteId ? { paciente_id: pacienteId } : undefined,
      )
      setPagos(data)
    } catch (e: unknown) {
      const mensaje = e instanceof Error ? e.message : 'Error desconocido'
      setError(mensaje)
      toast.error('Error al cargar historial de pagos', { description: mensaje })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function aplicarFiltroPaciente(pacienteId: number | null, pacienteNombre: string | null) {
    setPacienteFiltroId(pacienteId)
    setPacienteFiltroNombre(pacienteNombre)
    await cargar(pacienteId)
  }

  const columnas: Columna<PagoHistorial>[] = [
    {
      encabezado: 'Paciente',
      render: (p) => <span className="font-medium text-slate-800">{p.paciente}</span>,
    },
    {
      encabezado: 'Email',
      render: (p) => <span className="text-slate-600">{p.email}</span>,
    },
    {
      encabezado: 'Turno',
      render: (p) => <span className="text-slate-600">{p.turno}</span>,
    },
    {
      encabezado: 'Fecha de pago',
      render: (p) => <span className="text-slate-600">{formatearFechaPago(p.fecha_pago)}</span>,
    },
    {
      encabezado: 'Estado',
      render: (p) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[p.estado]}`}
        >
          {ESTADO_LABELS[p.estado]}
        </span>
      ),
    },
    {
      encabezado: 'Monto',
      render: (p) => <span className="font-medium text-slate-800">{formatearMonto(p.monto)}</span>,
    },
  ]

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 w-full bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Cargando historial de pagos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-sm flex items-center gap-3 shadow-sm">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div><span className="font-bold">Hubo un problema:</span> {error}</div>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Historial de pagos</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Últimos {LIMITE_HISTORIAL} pagos registrados
            {pacienteFiltroNombre ? ` de ${pacienteFiltroNombre}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pacienteFiltroId && (
            <button
              type="button"
              onClick={() => aplicarFiltroPaciente(null, null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
            >
              Quitar filtro
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalFiltroAbierto(true)}
            className="bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200 shadow-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtrar por paciente
          </button>
        </div>
      </div>

      <TablaGenerica
        datos={pagos}
        columnas={columnas}
        mensajeVacio={
          pacienteFiltroId
            ? 'No posee pagos registrados.'
            : 'No existen pagos registrados.'
        }
      />

      <FiltrarPacienteModal
        abierto={modalFiltroAbierto}
        pacienteSeleccionadoId={pacienteFiltroId}
        onClose={() => setModalFiltroAbierto(false)}
        onAplicar={aplicarFiltroPaciente}
      />
    </div>
  )
}
