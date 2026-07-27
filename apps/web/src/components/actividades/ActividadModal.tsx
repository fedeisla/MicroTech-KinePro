'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Actividad } from '@/types/actividad'
import { crearActividad, modificarActividad } from '@/services/actividadesService'

interface ActividadModalProps {
  abierto: boolean
  actividad: Actividad | null   // null = modo crear, con datos = modo modificar
  onClose: () => void
  onGuardado: () => void        // para refrescar la tabla
}

export default function ActividadModal({ abierto, actividad, onClose, onGuardado }: ActividadModalProps) {
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [guardando, setGuardando] = useState(false)

  const esModificar = actividad !== null
  const hayCambios = esModificar && actividad
    ? nombre.trim() !== (actividad.nombre ?? '') || precio.trim() !== String(actividad.precio ?? '')
    : true

  useEffect(() => {
    if (abierto) {
      setNombre(actividad?.nombre ?? '')
      setPrecio(actividad ? String(actividad.precio) : '')
    }
  }, [abierto, actividad])

  if (!abierto) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const payload: { nombre?: string; precio?: number } = {}
      if (nombre.trim() !== '') payload.nombre = nombre.trim()
      if (precio.trim() !== '') payload.precio = Number(precio)

      const res = esModificar && actividad
        ? await modificarActividad(actividad.id, payload as any)
        : await crearActividad(payload as any)
      toast.success(res.message)
      onGuardado()
      onClose()
    } catch (err: any) {
      toast.error('Error', { description: err.message })
    } finally {
      setGuardando(false)
    }
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

        <h3 className="mb-4 text-lg font-bold text-kine-blue">
          {esModificar ? 'Modificar actividad' : 'Crear actividad'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
              placeholder="Ej: Tren medio"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || (esModificar && !hayCambios)}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-kine-blue text-white hover:bg-kine-blue-deep disabled:opacity-50 flex items-center gap-2"
            >
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
              {esModificar ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}