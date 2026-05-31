import { apiFetch } from "@/lib/api"

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export async function obtenerUsuarioPorId(id: number): Promise<any> {
  return apiFetch(`/usuarios/${id}`, {
    method: 'GET',
  })
}

export async function modificarContrasena(payload: {
  email: string
  passwordActual: string
  passwordNueva: string
}): Promise<{ message: string }> {
  return apiFetch('/usuarios/modificarcontrasena', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function solicitarRestablecimiento(email: string): Promise<{ message: string }> {
  return apiFetch('/usuarios/llamadarestablecimiento', {
    method: 'PUT',
    body: JSON.stringify({ email }),
  })
}

export async function restablecerContrasena(payload: {
  token: string
  passwordNueva: string
}): Promise<{ message: string }> {
  return apiFetch('/usuarios/restablecimiento', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function desbloquearCuenta(token: string): Promise<{ message: string }> {
  return apiFetch('/usuarios/desbloqueo', {
    method: 'PUT',
    body: JSON.stringify({ token }),
  })
}

export async function modificarDatosPersonales(payload: {
  id: number
  nombre?: string
  apellido?: string
  email?: string
  telefono?: string
  dni?: string
}): Promise<{ message: string }> {
  return apiFetch('/usuarios/modificacion', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function asignarRol(id: number, payload: { rol: string }): Promise<{ message: string }> {
  return apiFetch(`/usuarios/${id}/rol`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function eliminarUsuario(id: number): Promise<{ message: string }> {
  return apiFetch(`/usuarios/${id}`, {
    method: 'DELETE',
  })
}
