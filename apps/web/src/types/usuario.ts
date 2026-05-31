export interface Usuario {
  id: number
  nombre: string
  apellido: string
  email: string
  dni: string
  telefono: string
  rol: 'ADMIN' | 'PACIENTE' | 'OWNER'
  fecha_registro: string
}

export interface UsuarioInput {
  nombre?: string
  apellido?: string
  email?: string
  dni?: string
  telefono?: string
  rol?: 'ADMIN' | 'PACIENTE' | 'OWNER'
}
