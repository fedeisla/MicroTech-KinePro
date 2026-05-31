/** Parsea YYYY-MM-DD como fecha local (sin corrimiento UTC). */
export function parseFechaLocal(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Formatea Date local a YYYY-MM-DD. */
export function formatearFechaLocal(fecha: Date): string {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/** Todas las fechas con el mismo día de semana entre inicio y fin (inclusive). */
export function fechasMismoDiaSemana(inicio: Date, fin: Date): Date[] {
  const diaSemana = inicio.getDay()
  const fechas: Date[] = []
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())

  while (cursor <= fin) {
    if (cursor.getDay() === diaSemana) {
      fechas.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return fechas
}
