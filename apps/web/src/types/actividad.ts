export interface Actividad {
  id: number
  nombre: string
  precio: string | number  // Prisma Decimal viene como string en JSON
}

export interface ActividadInput {
  nombre: string
  precio: number
}