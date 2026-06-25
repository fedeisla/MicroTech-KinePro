export type EstadoTurno = 'DISPONIBLE' | 'RESERVADO' | 'CANCELADO'
export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'ASISTIO' | 'AUSENTE'

export interface Inscripto {
  id: number
  nombre: string
  apellido: string
  email: string
  dni?: string
  estado: EstadoReserva
  pagado: boolean
}

export interface TurnoResumen {
  id: number
  horario: string
  actividad: string
  estado: EstadoTurno
  capacidad: number
  reservasActuales: number
  espaciosLibres: number
}

export interface TurnoDetalle {
  id: number
  fecha: string
  horario: string
  actividad: string
  precio: number
  tipoActividadId: number
  capacidad: number
  reservasActuales: number
  espaciosLibres: number
  inscriptos: Inscripto[]
}

export interface TurnoResumenConFecha extends TurnoResumen {
  fecha: string
}

export interface CrearTurnoInput {
  tipoActividad_id: number
  fecha: string         // formato YYYY-MM-DD
  hora_inicio: string   // formato HH:MM
  capacidad: number
}


export interface Actividad {
  id: number;
  nombre: string;
  cuposTotales: number;
  cuposDisponibles: number;
}

export interface RangoHorarioBackend {
  idTurno: number;
  desde: string;
  hasta: string;
  actividades: Actividad[];
}

export interface TurnoEventoMes {
  id: number
  date: string       // YYYY-MM-DD
  actividad: string
  hora_inicio: string // HH:MM
  total_reservas: number
  pagados: number
}