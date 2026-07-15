/** Zona horaria de negocio del sistema (turnos como horarios de pared). */
export const TIMEZONE_NEGOCIO = 'America/Argentina/Buenos_Aires';

export function dateTimePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const map = new Map(parts.map((p) => [p.type, p.value]));
  const year = Number(map.get('year'));
  const month = Number(map.get('month'));
  const day = Number(map.get('day'));
  // en-CA puede devolver "24" para medianoche en algunos engines
  let hour = Number(map.get('hour'));
  if (hour === 24) hour = 0;
  const minute = Number(map.get('minute'));

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error(`No se pudieron obtener partes de fecha/hora para TZ=${timeZone}`);
  }

  return { year, month, day, hour, minute };
}

/**
 * Convierte un horario de pared (fecha DATE + hora TIME persistidos como UTC "naive")
 * al instante UTC real interpretado en la zona de negocio.
 */
export function wallClockTurnoToUtc(
  fecha: Date,
  horaInicio: Date,
  timeZone: string = TIMEZONE_NEGOCIO,
): Date {
  const year = fecha.getUTCFullYear();
  const month = fecha.getUTCMonth() + 1;
  const day = fecha.getUTCDate();
  const hour = horaInicio.getUTCHours();
  const minute = horaInicio.getUTCMinutes();

  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const parts = dateTimePartsInTimeZone(new Date(desiredAsUtc), timeZone);
  const gotAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0);
  return new Date(desiredAsUtc - (gotAsUtc - desiredAsUtc));
}

export function fechaEnvioRecordatorio24h(
  fecha: Date,
  horaInicio: Date,
  timeZone: string = TIMEZONE_NEGOCIO,
): Date {
  const inicioTurno = wallClockTurnoToUtc(fecha, horaInicio, timeZone);
  return new Date(inicioTurno.getTime() - 24 * 60 * 60 * 1000);
}

export function formatFechaHoraPared(fecha: Date, horaInicio: Date) {
  const fechaStr = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  ).toLocaleDateString('es-AR', { timeZone: 'UTC' });
  const horaStr =
    horaInicio.getUTCHours().toString().padStart(2, '0') +
    ':' +
    horaInicio.getUTCMinutes().toString().padStart(2, '0');
  return { fechaStr, horaStr };
}
