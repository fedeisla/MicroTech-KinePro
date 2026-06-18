import { apiFetch } from '@/lib/api'
import type { EstadisticasResponse } from '@/types/estadisticas'

export async function getEstadisticas(desde: string, hasta: string): Promise<EstadisticasResponse> {
  const params = new URLSearchParams({ desde, hasta })
  return apiFetch<EstadisticasResponse>(`/estadisticas?${params.toString()}`)
}
