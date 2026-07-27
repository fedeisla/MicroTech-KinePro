'use client'

import TablaActividades from '@/components/actividades/TablaActividades'
import { useRequireRole } from '@/hooks/useAuth'

export default function ActividadesPage() {
  const { autorizado, cargando } = useRequireRole(['ADMIN', 'OWNER'])

  if (cargando) return <p className="p-6 text-slate-500">Cargando...</p>
  if (!autorizado) return null

  return (
    <div className="w-full">
      <TablaActividades />
    </div>
  )
}