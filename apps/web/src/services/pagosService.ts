import { apiFetch } from '@/lib/api'

// ===========================================
// Pago presencial (efectivo / tarjeta)
// ===========================================
export type MetodoPagoPresencial = 'EFECTIVO' | 'TARJETA'

export interface RegistrarPagoInput {
  reserva_id: number
  metodo: MetodoPagoPresencial
  monto?: number
}

export async function registrarPago(input: RegistrarPagoInput): Promise<{ message: string }> {
  return apiFetch('/pagos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// ===========================================
// Pago con MercadoPago (online)
// ===========================================
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('kinepro_token')
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.message ?? `Error ${res.status}`
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg)
  }
  return data as T
}

export async function crearPreferenceMP(reservaId: number) {
  return authFetch<{ init_point: string; preference_id: string }>(
    `/pagos/mercadopago/preference/${reservaId}`,
    { method: 'POST' },
  )
}

export async function confirmarPagoMP(paymentId: string) {
  return authFetch<{ status: string; message: string }>(
    `/pagos/mercadopago/confirmar/${paymentId}`,
    { method: 'POST' },
  )
}

export async function cancelarPagoMP(reservaId: number) {
  return authFetch<{ message: string }>(
    `/pagos/mercadopago/cancelar/${reservaId}`,
    { method: 'POST' },
  )
}

export async function verificarPagoMP(reservaId: number) {
  return authFetch<{ status: string; message: string }>(
    `/pagos/mercadopago/verificar/${reservaId}`,
    { method: 'POST' },
  )
}

export async function crearPreferenceMPFijo(reservaIds: number[]) {
  return authFetch<{ init_point: string; preference_id: string; grupoId: number }>(
    `/pagos/mercadopago/preference-fijo`,
    {
      method: 'POST',
      body: JSON.stringify({ reservaIds }),
    },
  )
}

export async function verificarPagoMPFijo(grupoId: number) {
  return authFetch<{ status: string; message: string }>(
    `/pagos/mercadopago/verificar-fijo/${grupoId}`,
    { method: 'POST' },
  )
}

export async function cancelarPagoMPFijo(reservaIds: number[]) {
  return authFetch<{ message: string }>(
    `/pagos/mercadopago/cancelar-fijo`,
    {
      method: 'POST',
      body: JSON.stringify({ reservaIds }),
    },
  )
}