'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  restablecerContrasena,
  solicitarRestablecimiento,
} from '@/services/usuariosService'

function RestablecerContenido() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmacion, setPasswordConfirmacion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mensajeEnlace, setMensajeEnlace] = useState<string | null>(null)

  async function handleSolicitarEnlace(e: React.FormEvent) {
    e.preventDefault()
    setProcesando(true)
    setMensajeEnlace(null)
    try {
      const res = await solicitarRestablecimiento(email.trim())
      setMensajeEnlace(res.message)
      toast.success(res.message)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar el enlace'
      toast.error(msg)
    } finally {
      setProcesando(false)
    }
  }

  async function handleRestablecer(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    if (passwordNueva !== passwordConfirmacion) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setProcesando(true)
    try {
      const res = await restablecerContrasena({ token, passwordNueva })
      toast.success(res.message)
      setTimeout(() => router.push('/'), 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restablecer la contraseña'
      toast.error(msg)
    } finally {
      setProcesando(false)
    }
  }

  if (token) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-slate-800">Restablecer contraseña</h1>
          <p className="mb-6 text-sm text-slate-500">
            Ingresá tu nueva contraseña (mínimo 8 caracteres, distinta a la anterior).
          </p>

          <form onSubmit={handleRestablecer} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={passwordConfirmacion}
                onChange={(e) => setPasswordConfirmacion(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={procesando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
              Restablecer contraseña
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="text-teal-600 hover:underline">
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-slate-800">Recuperar contraseña</h1>
        

        <form onSubmit={handleSolicitarEnlace} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ejemplo@kinepro.com"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Obtener enlace
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="text-teal-600 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RestablecerPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-sm text-slate-500">Cargando...</p>
      }
    >
      <RestablecerContenido />
    </Suspense>
  )
}
