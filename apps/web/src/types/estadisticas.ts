export type EstadisticasResponse = {
  totalReservas: number
  cancelaciones: { total: number }
  reprogramaciones: { total: number; reservasAfectadas: number }
  demandaActividad: {
    items: { actividad: string; cantidad: number }[]
  }
  ingresos: {
    items: { metodo: string; monto: number }[]
  }
  asistencia: {
    totalTurnos: number
    totalInscriptos: number
    presentes: number
    ausentes: number
  }
}
