import { apiFetch } from '@/lib/api'
import type { CrearTurnoInput, RangoHorarioBackend, TurnoDetalle, TurnoEventoMes, TurnoResumen, TurnoResumenConFecha } from '@/types/turno'


function extractHora(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}
function calcularHoraHasta(horaDesde: string): string {
  const [h, m] = horaDesde.split(':');
  const proximaHora = (parseInt(h) + 1).toString().padStart(2, '0');
  return `${proximaHora}:${m}`;
}
export interface DiasDisponiblesResponse {
  diasConCupo: number[];
  diasLlenos: number[];
}



export async function crearTurno(input: CrearTurnoInput): Promise<{ message: string }> {
  return apiFetch('/turnos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
export async function getTurnosByFecha(fecha: string): Promise<TurnoResumen[]> {
  const data = await apiFetch<any[]>(`/turnos?fecha=${fecha}`, { omitToken: true });
  return data.map((t) => ({
    id: t.id,
    horario: extractHora(t.hora_inicio),
    actividad: t.actividad,
    estado: t.estado,
    capacidad: t.capacidad,
    reservasActuales: t.cantidad_inscriptos,
    espaciosLibres: t.espacios_libres,
  }))
}

function fechaHoraUTC(fecha: string, horario: string): Date {
  const [year, month, day] = fecha.split('-').map(Number);
  const [hour, minute] = horario.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
}

export async function getTurnosProximos(
  cantidad = 3,
  diasMaximos = 14,
): Promise<TurnoResumenConFecha[]> {
  const resultados: TurnoResumenConFecha[] = [];
  const hoy = new Date();
  const hoyUtc = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate(), hoy.getUTCHours(), hoy.getUTCMinutes(), hoy.getUTCSeconds(), hoy.getUTCMilliseconds()));

  let fechaActual = new Date(hoyUtc);
  for (let dia = 0; dia < diasMaximos && resultados.length < cantidad; dia += 1) {
    const fechaStr = fechaActual.toISOString().slice(0, 10);
    const turnosDelDia = await getTurnosByFecha(fechaStr);

    const turnosFiltrados = turnosDelDia
      .filter((turno) => {
        if (dia === 0) {
          const turnoDate = fechaHoraUTC(fechaStr, turno.horario);
          return turnoDate.getTime() >= hoyUtc.getTime();
        }
        return true;
      })
      .sort((a, b) => a.horario.localeCompare(b.horario))
      .map((turno) => ({ ...turno, fecha: fechaStr }));

    resultados.push(...turnosFiltrados.slice(0, cantidad - resultados.length));
    fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
  }

  return resultados;
}

export async function getTurnoById(id: number): Promise<TurnoDetalle> {
  const data = await apiFetch<any>(`/turnos/${id}`)
  return {
    id: data.id,
    fecha: data.fecha,
    horario: extractHora(data.hora_inicio),
    actividad: data.actividad,
    precio: data.precio,
    tipoActividadId: data.tipoActividad_id,
    capacidad: data.capacidad,
    reservasActuales: data.cantidad_inscriptos ?? data.cantidad_reservas ?? 0,
    espaciosLibres: data.espacios_libres,
    inscriptos: (data.inscriptos ?? []).map((i: any) => ({
      id: i.id,
      nombre: i.nombre,
      apellido: i.apellido,
      email: i.email ?? '',
      dni: i.dni ?? '',
      estado: i.estado,
      pagado: i.pagado ?? false,
    })),
  }
}
export async function getHorariosTurnos(fecha: string): Promise<RangoHorarioBackend[]> {
  

  const turnosPlanos = await apiFetch<any[]>(`/turnos?fecha=${fecha}`,{ omitToken: true });
  const turnosAgrupados = new Map<string, RangoHorarioBackend>();

  turnosPlanos.forEach((t) => {
    if ( t.espacios_libres <= 0) return;

    const horaDesde = extractHora(t.hora_inicio);

    // Si todavía no creamos el grupo para esta hora, lo inicializamos
    if (!turnosAgrupados.has(horaDesde)) {
      turnosAgrupados.set(horaDesde, {
        idTurno: t.id,
        desde: horaDesde,
        hasta: calcularHoraHasta(horaDesde),
        actividades: [],
      });
    }

    // Metemos la actividad adentro del grupo horario correspondiente
    turnosAgrupados.get(horaDesde)!.actividades.push({
      id: t.id,
      nombre: t.actividad,  
      cuposTotales: t.capacidad,
      cuposDisponibles: t.espacios_libres,
    });
  });


  return Array.from(turnosAgrupados.values());
 
  
}

export async function getDiasDisponiblesDelMes(mes: number, anio: number): Promise<DiasDisponiblesResponse> {
  return apiFetch<DiasDisponiblesResponse>(`/turnos/dias-disponibles/${mes}/${anio}`, { omitToken: true });
}

export async function getReservasMes(mes: number, anio: number): Promise<TurnoEventoMes[]> {
  return apiFetch<TurnoEventoMes[]>(`/turnos/reservas-mes/${mes}/${anio}`);
}

// import type { TurnoDetalle, TurnoResumen, CrearTurnoInput } from '@/types/turno'

// const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

// async function requestTurno<T>(path: string, options?: RequestInit): Promise<T> {
//   const res = await fetch(`${API}${path}`, {
//     headers: { 'Content-Type': 'application/json' },
//     ...options,
//   })
//   const data = await res.json().catch(() => null)
//   if (!res.ok) {
//     const msg = data?.message ?? `Error ${res.status}`
//     throw new Error(Array.isArray(msg) ? msg.join(', ') : msg)
//   }
//   return data as T
// }

// // El back devuelve hora_inicio como ISO ("1970-01-01T10:00:00.000Z").
// // Extraemos solo "HH:MM" para mostrar en el front.
// function extractHora(isoString: string): string {
//   const d = new Date(isoString)
//   const h = d.getUTCHours().toString().padStart(2, '0')
//   const m = d.getUTCMinutes().toString().padStart(2, '0')
//   return `${h}:${m}`
// }

// export async function getTurnosByFecha(fecha: string): Promise<TurnoResumen[]> {
//   const data = await requestTurno<any[]>(`/turnos?fecha=${fecha}`)
//   return data.map((t) => ({
//     id: t.id,
//     horario: extractHora(t.hora_inicio),
//     actividad: t.actividad,
//     estado: t.estado,
//     capacidad: t.capacidad,
//     reservasActuales: t.cantidad_inscriptos,
//     espaciosLibres: t.espacios_libres,
//   }))
// }

// export async function getTurnoById(id: number): Promise<TurnoDetalle> {
//   const t = await requestTurno<any>(`/turnos/${id}`)
//   return {
//     id: t.id,
//     horario: extractHora(t.hora_inicio),
//     actividad: t.actividad,
//     reservasActuales: t.cantidad_reservas,
//     espaciosLibres: t.espacios_libres,
//   }
// }

// export async function crearTurno(input: CrearTurnoInput): Promise<{ message: string }> {
//   return requestTurno('/turnos', {
//     method: 'POST',
//     body: JSON.stringify(input),
//   })
// }