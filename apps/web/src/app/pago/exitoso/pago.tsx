'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { confirmarPagoMP } from '@/services/pagosService'

export default function PagoExitosoPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando')

  useEffect(() => {
    const paymentId = sp.get('payment_id')
    if (!paymentId) {
      setEstado('error')
      return
    }
    confirmarPagoMP(paymentId)
      .then((r) => {
        if (r.status === 'ok') {
          toast.success('¡Pago confirmado!')
          setEstado('ok')
        } else {
          toast.error(r.message)
          setEstado('error')
        }
      })
      .catch((e) => {
        toast.error('Error', { description: e.message })
        setEstado('error')
      })
  }, [sp])

  return (
    <div className="mx-auto max-w-md mt-20 text-center bg-white p-8 rounded-2xl shadow border">
      {estado === 'cargando' && <p>Confirmando pago…</p>}
      {estado === 'ok' && (
        <>
          <h1 className="text-2xl font-bold text-emerald-600 mb-2">¡Pago exitoso!</h1>
          <p className="text-slate-600 mb-6">Tu turno quedó confirmado.</p>
          <button onClick={() => router.push('/mis-turnos/pendientes')} className="bg-kine-blue text-white px-4 py-2 rounded-lg">
            Ver mis turnos
          </button>
        </>
      )}
      {estado === 'error' && (
        <>
          <h1 className="text-2xl font-bold text-red-600 mb-2">No pudimos confirmar el pago</h1>
          <button onClick={() => router.push('/')} className="bg-slate-200 px-4 py-2 rounded-lg">Volver al inicio</button>
        </>
      )}
    </div>
  )
}