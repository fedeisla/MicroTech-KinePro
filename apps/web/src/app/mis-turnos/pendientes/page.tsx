'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ListaTurnosPendientes from '@/components/turnos/ListaTurnosPendientes'
import { obtenerMisReservas } from '@/services/turnosPacientesService'
import { useAuth, useRequireRole } from '@/hooks/useAuth'

export default function TurnosPendientesPage() {
  const { autorizado, cargando } = useRequireRole(['PACIENTE'])
  const [turnosConfirmados, setTurnosConfirmados] = useState<any[]>([])

  const refresh = async () => {
    const data = await obtenerMisReservas('CONFIRMADA')
    setTurnosConfirmados(data)
  }

  useEffect(() => {
    if (!autorizado) return
    refresh()
      .catch((err) => console.error('Error al traer los turnos:', err))
  }, [autorizado])

  if (cargando) return <p className="p-6 text-sm text-slate-500">Cargando...</p>
  
  if (!autorizado) {
    return null; 
  }
  

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <Link href="/" className="text-sm text-teal-600 hover:underline">
          ← Volver al inicio
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Turnos pendientes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestioná tus próximas reservas. Podés cancelar o reprogramar cada turno.
        </p>
      </div>
      <ListaTurnosPendientes turnos={turnosConfirmados} onActualizado={refresh} />
    </div>
  )
}