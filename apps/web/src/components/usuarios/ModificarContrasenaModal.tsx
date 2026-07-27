'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { modificarContrasena } from '@/services/usuariosService'

interface ModificarContrasenaModalProps {
  abierto: boolean
  email: string
  onClose: () => void
}

export default function ModificarContrasenaModal({
  abierto,
  email,
  onClose,
}: ModificarContrasenaModalProps) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [guardando, setGuardando] = useState(false)

  if (!abierto) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!passwordActual) {
      toast.error('La contraseña actual es obligatoria')
      return
    }

    if (!passwordNueva || passwordNueva.length < 8) {
      toast.error('La contraseña nueva debe contener mínimo 8 caracteres')
      return
    }

    setGuardando(true)
    try {
      const res = await modificarContrasena({
        email,
        passwordActual,
        passwordNueva,
      })
      toast.success(res.message)
      setPasswordActual('')
      setPasswordNueva('')
      onClose()
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error al modificar la contraseña'
      toast.error(mensaje)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
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

        <h3 className="mb-1 text-lg font-bold text-kine-blue">Modificar contraseña</h3>
        <p className="mb-4 text-xs text-slate-500">{email}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Contraseña actual
            </label>
            <input
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Contraseña nueva
            </label>
            <input
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kine-blue"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 rounded-lg bg-kine-blue px-4 py-2 text-sm font-semibold text-white hover:bg-kine-blue-deep disabled:opacity-50"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Modificar contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
