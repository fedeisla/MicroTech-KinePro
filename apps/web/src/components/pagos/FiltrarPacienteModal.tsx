'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { PacienteFiltrable } from '@/types/pago'
import { obtenerPacientesParaFiltro } from '@/services/pagosService'

interface FiltrarPacienteModalProps {
  abierto: boolean
  pacienteSeleccionadoId: number | null
  onClose: () => void
  onAplicar: (pacienteId: number | null, pacienteNombre: string | null) => void
}

export default function FiltrarPacienteModal({
  abierto,
  pacienteSeleccionadoId,
  onClose,
  onAplicar,
}: FiltrarPacienteModalProps) {
  const [pacientes, setPacientes] = useState<PacienteFiltrable[]>([])
  const [cargando, setCargando] = useState(false)
  const [seleccion, setSeleccion] = useState<string>('')

  useEffect(() => {
    if (!abierto) return
    setSeleccion(pacienteSeleccionadoId ? String(pacienteSeleccionadoId) : '')
    setCargando(true)
    obtenerPacientesParaFiltro()
      .then(setPacientes)
      .catch((e: unknown) => {
        const mensaje = e instanceof Error ? e.message : 'Error desconocido'
        toast.error('No se pudieron cargar los pacientes', { description: mensaje })
      })
      .finally(() => setCargando(false))
  }, [abierto, pacienteSeleccionadoId])

  if (!abierto) return null

  function handleAplicar() {
    const paciente = pacientes.find((p) => String(p.id) === seleccion)
    onAplicar(
      seleccion ? Number(seleccion) : null,
      paciente?.nombre ?? null,
    )
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className="mb-4 text-lg font-bold text-kine-blue">Filtrar por paciente</h3>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando pacientes...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Paciente</label>
              <select
                value={seleccion}
                onChange={(e) => setSeleccion(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Todos los pacientes</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAplicar}
                className="rounded-xl bg-kine-blue px-4 py-2 text-sm font-semibold text-white hover:bg-kine-blue-deep"
              >
                Aplicar filtro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
