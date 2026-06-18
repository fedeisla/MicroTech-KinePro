import { apiFetch } from "@/lib/api";
import { CrearReservaInput } from "@/types/reserva"



export function formatearFechas(fechasMensuales: Date[]): string[] {
  return fechasMensuales.map(fecha => {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    return `${año}-${mes}-${dia}`;
  });
}

export interface ReservaFijaResponse {
  message: string;
  descuentoAplicado?: string;
  cantidadTurnos?: number;
}

export async function crearReservaFija(turnoBaseId: number, fechasMensuales: Date[]): Promise<ReservaFijaResponse> {
    return apiFetch<ReservaFijaResponse>('/reserva/fija', {
       method: 'POST',
       body: JSON.stringify({ 
          turnoInicialId: turnoBaseId, 
          fechas: formatearFechas(fechasMensuales) 
       })
    });
}

export async function crearReserva(input: CrearReservaInput): Promise<{ message: string; reservaId: number }> {
  return apiFetch('/reserva/crear', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function crearReservaPresencial(email: string, turno_id: number) {
  return apiFetch('/reserva/crear-presencial', {
    method: 'POST',
    body: JSON.stringify({ email, turno_id }),
  })
}

export async function crearReservaFijaPresencial(
  email: string,
  turnoInicialId: number,
  fechasMensuales: Date[],
): Promise<ReservaFijaResponse> {
  return apiFetch<ReservaFijaResponse>('/reserva/fija-presencial', {
    method: 'POST',
    body: JSON.stringify({ email, turnoInicialId, fechas: formatearFechas(fechasMensuales) }),
  })
}

export async function cancelarReserva(
  reservaId: number,
): Promise<{ message: string; puedeReprogramar?: boolean }> {
  return apiFetch(`/reserva/${reservaId}`, {
    method: 'DELETE',
  })
}

export async function reprogramarReserva(
  reservaId: number,
  turno_id: number,
): Promise<{ message: string; cantReprogramaciones?: number; pierdeDescuento?: boolean }> {
  return apiFetch(`/reserva/${reservaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ turno_id }),
  })
}

export async function cancelarReservaPresencial(
  reservaId: number,
): Promise<{ message: string }> {
  return apiFetch(`/reserva/presencial/${reservaId}`, {
    method: 'DELETE',
  })
}

export async function reprogramarReservaPresencial(
  reservaId: number,
  turno_id: number,
): Promise<{ message: string; cantReprogramaciones?: number; pierdeDescuento?: boolean }> {
  return apiFetch(`/reserva/presencial/${reservaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ turno_id }),
  })
}

export async function registrarAsistenciaReserva(
  reservaId: number,
  estado: 'ASISTIO' | 'AUSENTE',
): Promise<{ message: string; ausenciasMensuales: number; penalizacionAplicada: boolean }> {
  return apiFetch(`/reserva/asistencia/${reservaId}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}
