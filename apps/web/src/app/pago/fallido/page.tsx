'use client'

import { useRouter } from 'next/navigation'

export default function PagoFallidoPage() {
  const router = useRouter()
  return (
    <div className="mx-auto max-w-md mt-20 text-center bg-white p-8 rounded-2xl shadow border">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Pago rechazado</h1>
      <p className="text-slate-600 mb-6">
        MercadoPago no pudo procesar el pago. Tu turno fue cancelado y volvió a quedar disponible.
      </p>
      <button
        onClick={() => router.push('/')}
        className="bg-kine-blue text-white px-4 py-2 rounded-lg"
      >
        Volver al inicio
      </button>
    </div>
  )
}