'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react'
import TablaGenerica, { Columna } from '@/components/TablaGenerica'
import ActividadModal from './ActividadModal'
import { getActividades, eliminarActividad } from '@/services/actividadesService'
import type { Actividad } from '@/types/actividad'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function TablaActividades() {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [actividadEnEdicion, setActividadEnEdicion] = useState<Actividad | null>(null)
  const [actividadAEliminar, setActividadAEliminar] = useState<Actividad | null>(null)
  const [eliminando, setEliminando] = useState(false)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      const data = await getActividades()
      setActividades(data)
    } catch (e: any) {
      setError(e.message)
      toast.error('Error al cargar actividades', { description: e.message })
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  function abrirCrear() {
    setActividadEnEdicion(null)
    setModalAbierto(true)
  }

  function abrirModificar(actividad: Actividad) {
    setActividadEnEdicion(actividad)
    setModalAbierto(true)
  }

  function pedirEliminar(actividad: Actividad) {
    setActividadAEliminar(actividad)
  }

  async function confirmarEliminar() {
    if (!actividadAEliminar) return
    setEliminando(true)
    try {
      const res = await eliminarActividad(actividadAEliminar.id)
      toast.success(res.message)
      setActividadAEliminar(null)
      cargar()
    } catch (e: any) {
      toast.error('No se pudo eliminar', { description: e.message })
    } finally {
      setEliminando(false)
    }
  }

  const columnas: Columna<Actividad>[] = [
    {
      encabezado: 'Nombre',
      render: (a) => <span className="font-medium text-slate-800">{a.nombre}</span>,
    },
    {
      encabezado: 'Precio',
      render: (a) => <span className="text-slate-600">$ {Number(a.precio).toFixed(2)}</span>,
    },
    {
      encabezado: 'Acciones',
      render: (a) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => abrirModificar(a)}
            className="bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-600 p-2 rounded-xl text-xs font-semibold border border-slate-200 hover:border-teal-200 flex items-center gap-1.5 transition-colors"
            title="Modificar"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modificar
          </button>
          <button
            onClick={() => pedirEliminar(a)}
            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-1.5 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </button>
        </div>
      ),
    },
  ]

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3 w-full bg-white rounded-2xl border border-slate-100 shadow-sm">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Cargando actividades...</p>
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
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Actividades</h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestión de actividades del centro</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-100">
            Total: {actividades.length}
          </span>
          <button
            onClick={abrirCrear}
            className="bg-kine-blue hover:bg-kine-blue-deep text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear actividad
          </button>
        </div>
      </div>

      <TablaGenerica
        datos={actividades}
        columnas={columnas}
        mensajeVacio="No existen actividades registradas."
      />

      <ActividadModal
        abierto={modalAbierto}
        actividad={actividadEnEdicion}
        onClose={() => setModalAbierto(false)}
        onGuardado={cargar}
      />

      <ConfirmDialog
        abierto={actividadAEliminar !== null}
        titulo="Eliminar actividad"
        mensaje={
          actividadAEliminar
            ? `¿Estás seguro de que querés eliminar la actividad "${actividadAEliminar.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        procesando={eliminando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setActividadAEliminar(null)}
      />
    </div>
  )
}