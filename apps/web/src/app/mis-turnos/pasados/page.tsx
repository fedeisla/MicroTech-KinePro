'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ListaTurnosPasados from '@/components/turnos/ListaTurnosPasados'
import { obtenerMisReservasPasadas } from '@/services/turnosPacientesService'
import { useRequireRole } from '@/hooks/useAuth'

export default function TurnosPasadosPage() {
  const { autorizado, cargando } = useRequireRole(['PACIENTE'])
  const [turnosPasados, setTurnosPasados] = useState<any[]>([])

  useEffect(() => {
    if (!autorizado) return
    obtenerMisReservasPasadas()
      .then((data) => setTurnosPasados(data))
      .catch((err) => console.error('Error al traer los turnos:', err))
  }, [autorizado])

  if (cargando) return <p className="p-6 text-sm text-slate-500">Cargando...</p>
  if (!autorizado) return null

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-teal-600 hover:underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Historial de turnos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultá tus turnos anteriores y el registro de asistencia.
        </p>
      </div>
      <ListaTurnosPasados turnos={turnosPasados} />
    </div>
  )
}