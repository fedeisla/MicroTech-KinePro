'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { desbloquearCuenta } from '@/services/usuariosService'

function DesbloqueoContenido() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [procesando, setProcesando] = useState(false)
  const [completado, setCompletado] = useState(false)

  async function handleDesbloquear() {
    if (!token) {
      toast.error('El enlace de desbloqueo no es válido')
      return
    }

    setProcesando(true)
    try {
      const res = await desbloquearCuenta(token)
      toast.success(res.message)
      setCompletado(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al desbloquear la cuenta'
      toast.error(msg)
    } finally {
      setProcesando(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
        <p className="text-sm text-slate-600">El enlace de desbloqueo no es válido o ya expiró.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-teal-600 hover:underline">
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-800">Desbloquear cuenta</h1>
        <p className="mb-6 text-sm text-slate-500">
          Tu cuenta fue bloqueada por intentos fallidos de inicio de sesión. Confirmá el desbloqueo
          para volver a ingresar.
        </p>

        {completado ? (
          <>
            <p className="mb-4 text-sm font-medium text-pro-green-deep">Desbloqueo exitoso</p>
            <Link
              href="/"
              className="inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Ir a iniciar sesión
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={handleDesbloquear}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Desbloquear cuenta
          </button>
        )}
      </div>
    </div>
  )
}

export default function DesbloqueoPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-slate-500">Cargando...</p>}>
      <DesbloqueoContenido />
    </Suspense>
  )
}
