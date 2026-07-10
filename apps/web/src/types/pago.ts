export type EstadoPago = 'PENDIENTE' | 'COMPLETADO' | 'RECHAZADO' | 'REEMBOLSADO'

export interface PagoHistorial {
  id: number
  paciente_id: number
  paciente: string
  email: string
  turno: string
  fecha_pago: string | null
  estado: EstadoPago
  monto: number
}

export interface PacienteFiltrable {
  id: number
  nombre: string
  email: string
}

export interface FiltroHistorialPagos {
  paciente_id?: number
  estado?: EstadoPago
}
