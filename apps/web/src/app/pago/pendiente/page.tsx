'use client'

import { useRouter } from 'next/navigation'

export default function PagoPendientePage() {
  const router = useRouter()
  return (
    <div className="mx-auto max-w-md mt-20 text-center bg-white p-8 rounded-2xl shadow border">
      <h1 className="text-2xl font-bold text-amber-600 mb-2">Pago en proceso</h1>
      <p className="text-slate-600 mb-6">
        El pago está siendo procesado. Cuando MercadoPago confirme, verás tu turno en "Mis turnos".
      </p>
      <button
        onClick={() => router.push('/mis-turnos/pendientes')}
        className="bg-kine-blue text-white px-4 py-2 rounded-lg"
      >
        Ver mis turnos
      </button>
    </div>
  )
}