import type { TurnoPacientePasado, TurnoPacientePendiente } from '@/types/turnoPaciente'

/** Cambiá a false para probar el mensaje vacío de las HU */
export const MOSTRAR_TURNOS_MOCK = true

export const TURNOS_PENDIENTES_MOCK: TurnoPacientePendiente[] = [
  {
    id: 1,
    fecha: '2026-05-28',
    hora: '09:00',
    actividad: 'Kinesiología General',
    profesional: 'Lic. Martínez',
  },
  {
    id: 2,
    fecha: '2026-05-30',
    hora: '11:30',
    actividad: 'RPG',
    profesional: 'Lic. Fernández',
  },
  {
    id: 3,
    fecha: '2026-06-02',
    hora: '08:00',
    actividad: 'Pilates terapéutico',
    profesional: 'Lic. López',
  },
  {
    id: 4,
    fecha: '2026-06-05',
    hora: '16:00',
    actividad: 'Kinesiología Deportiva',
    profesional: 'Lic. Martínez',
  },
  {
    id: 5,
    fecha: '2026-06-10',
    hora: '10:15',
    actividad: 'Rehabilitación postural',
    profesional: 'Lic. Gómez',
  },
]

export const TURNOS_PASADOS_MOCK: TurnoPacientePasado[] = [
  {
    id: 101,
    fecha: '2026-05-05',
    hora: '09:00',
    actividad: 'Kinesiología General',
    profesional: 'Lic. Martínez',
    asistio: true,
  },
  {
    id: 102,
    fecha: '2026-05-08',
    hora: '11:00',
    actividad: 'RPG',
    profesional: 'Lic. Fernández',
    asistio: false,
  },
  {
    id: 103,
    fecha: '2026-05-12',
    hora: '15:30',
    actividad: 'Pilates terapéutico',
    profesional: 'Lic. López',
    asistio: true,
  },
  {
    id: 104,
    fecha: '2026-05-15',
    hora: '08:45',
    actividad: 'Kinesiología Deportiva',
    profesional: 'Lic. Martínez',
    asistio: true,
  },
  {
    id: 105,
    fecha: '2026-05-20',
    hora: '17:00',
    actividad: 'Rehabilitación postural',
    profesional: 'Lic. Gómez',
    asistio: false,
  },
]

export function getTurnosPendientesMock(): TurnoPacientePendiente[] {
  return MOSTRAR_TURNOS_MOCK ? TURNOS_PENDIENTES_MOCK : []
}

export function getTurnosPasadosMock(): TurnoPacientePasado[] {
  return MOSTRAR_TURNOS_MOCK ? TURNOS_PASADOS_MOCK : []
}
