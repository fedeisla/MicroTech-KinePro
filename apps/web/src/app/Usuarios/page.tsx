'use client'

import TablaUsuarios from '../Components/TablaUsuarios'
import { useRequireRole } from '@/hooks/useAuth'

export default function PacientesPage() {
  const { autorizado, cargando } = useRequireRole(['ADMIN', 'OWNER'])

  if (cargando) return <p className="p-6 text-slate-500">Cargando...</p>
  if (!autorizado) return null

  return (
    <div className="w-full">
      <TablaUsuarios />
    </div>
  )
}