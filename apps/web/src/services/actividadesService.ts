import { apiFetch } from '@/lib/api'
import type { Actividad, ActividadInput } from '@/types/actividad'





export async function getActividades(): Promise<Actividad[]> {
  return apiFetch<Actividad[]>('/actividades')
}

export async function crearActividad(input: ActividadInput): Promise<{ message: string }> {
  return apiFetch('/actividades', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function modificarActividad(id: number, input: ActividadInput): Promise<{ message: string }> {
  return apiFetch(`/actividades/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function eliminarActividad(id: number): Promise<{ message: string }> {
  return apiFetch(`/actividades/${id}`, { method: 'DELETE' })
}