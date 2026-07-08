'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { UserMinus, Clock, Loader2 } from 'lucide-react'
import { listaEsperaService } from '@/services/listaEsperaService' // Ajustá el path si es necesario

interface TabEsperaProps {
  turnoId: number
  onActualizarTurno: () => Promise<void>
}

export default function TabEspera({ turnoId, onActualizarTurno }: TabEsperaProps) {
  const [listaEspera, setListaEspera] = useState<any[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [cargandoId, setCargandoId] = useState<number | null>(null)

  // 1. Efecto para buscar la lista ni bien se abre la pestaña
  useEffect(() => {
    cargarLista()
  }, [turnoId])

  const cargarLista = async () => {
  setCargandoLista(true)
  try {
    const data = await listaEsperaService.obtenerListaAdmin(turnoId) as any[]
    setListaEspera(data)
  } catch (error) {
    toast.error('No se pudo cargar la lista de espera')
  } finally {
    setCargandoLista(false)
  }
}

  const handleEliminarDeEspera = async (idEspera: number) => {
    setCargandoId(idEspera)
    try {
      await listaEsperaService.cancelar(idEspera)
      toast.success('Paciente eliminado de la lista de espera')
      
      // Volvemos a cargar la lista local de esta pestaña
      await cargarLista() 
      // Le avisamos al componente padre por si tiene que actualizar contadores
      await onActualizarTurno() 
    } catch (error) {
      toast.error('No se pudo eliminar al paciente')
    } finally {
      setCargandoId(null)
    }
  }

  if (cargandoLista) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /></div>
  }

  if (listaEspera.length === 0) {
    return <p className="text-gray-500 text-sm italic py-2">No hay nadie en espera para este turno.</p>
  }



  return (
    <div className="space-y-3">
      {listaEspera.map((item: any, index: number) => (
        <div key={item.id} className="bg-pure-white border border-light-bg-gray rounded-lg p-3 flex justify-between items-center shadow-sm">
          
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold text-neutral-gray/40 w-6 text-center">
              #{index + 1}
            </div>
            <div>
              <p className="font-semibold text-text-main text-sm">
                {item.paciente?.usuario?.nombre} {item.paciente?.usuario?.apellido}
              </p>
              <div className="flex items-center gap-2 text-xs mt-1">
                {/* Badges de Prioridad con colores de la marca */}
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  item.prioridad === 1 
                    ? 'bg-kineblue-light/40 text-kineblue-deep' 
                    : 'bg-progreen-light/40 text-progreen-deep'
                }`}>
                  {item.prioridad === 1 ? 'Turno Fijo' : 'Por Demanda'}
                </span>
                
                {/* Badge de estado Notificando */}
                {item.estado === 'NOTIFICADO' && (
                  <span className="flex items-center gap-1 text-teal-accent bg-teal-accent/10 px-2 py-0.5 rounded-full border border-teal-accent/20">
                    <Clock className="w-3 h-3" /> Notificando...
                  </span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={() => handleEliminarDeEspera(item.id)}
            disabled={cargandoId === item.id}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            title="Dar de baja de la lista"
          >
            {cargandoId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
            <span>Baja</span>
          </button>
        </div>
      ))}
    </div>
  )
}