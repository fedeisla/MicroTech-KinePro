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


export async function marcarAsistencia(reservaId: number, asistio: boolean) {
  return authFetch<{ message: string }>(`/reserva/${reservaId}/asistencia`, {
    method: 'PATCH',
    body: JSON.stringify({ asistio }),
  })
}