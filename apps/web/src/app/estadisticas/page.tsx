'use client'

import EstadisticasPanel from '@/components/estadisticas/EstadisticasPanel'
import { useRequireRole } from '@/hooks/useAuth'

export default function EstadisticasPage() {
  const { autorizado, cargando } = useRequireRole(['OWNER'])

  if (cargando) return <p className="p-6 text-slate-500">Cargando...</p>
  if (!autorizado) return null

  return (
    <main className="min-h-screen bg-slate-100/60 p-6">
      <EstadisticasPanel />
    </main>
  )
}
