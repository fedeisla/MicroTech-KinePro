import { apiFetch } from '@/lib/api'

export interface DescuentoConfig {
  porcentaje: number
  actualizado_en: string
}

export async function obtenerDescuento(): Promise<DescuentoConfig> {
  return apiFetch<DescuentoConfig>('/configuracion/descuento')
}

export async function actualizarDescuento(porcentaje: number): Promise<{ porcentaje: number; message: string }> {
  return apiFetch<{ porcentaje: number; message: string }>('/configuracion/descuento', {
    method: 'PUT',
    body: JSON.stringify({ porcentaje }),
  })
}