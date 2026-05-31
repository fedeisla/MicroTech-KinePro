import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTurnoDto } from './turnos.dto';

function dateTimePartsInTimeZone(date: Date, timeZone: string) {
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
  const hour = Number(map.get('hour'));
  const minute = Number(map.get('minute'));

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error(`No se pudieron obtener partes de fecha/hora para TZ=${timeZone}`);
  }

  return { year, month, day, hour, minute };
}

function parseFechaYYYYMMDD(fecha: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) throw new BadRequestException('La fecha debe estar en formato YYYY-MM-DD');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (![year, month, day].every(Number.isFinite)) {
    throw new BadRequestException('La fecha debe ser válida');
  }
  return { year, month, day };
}

@Injectable()
export class TurnosService {
  constructor(private prisma: PrismaService) {}

  async crear(dto: CreateTurnoDto) {
    // Verificar que la actividad exista
    const actividad = await this.prisma.tipoActividad.findUnique({
      where: { id: dto.tipoActividad_id },
    });
    if (!actividad) {
      throw new NotFoundException('La actividad no existe');
    }

    // Persistimos `fecha` (@db.Date) y `hora_inicio` (@db.Time) como "valores de pared" (sin TZ).
    // Usar Date.UTC evita corrimientos cuando Prisma serializa a ISO (UTC) y la DB es DATE/TIME.
    const { year, month, day } = parseFechaYYYYMMDD(dto.fecha);
    const fechaDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const [horaIngresada, minutosIngresados] = dto.hora_inicio.split(':').map(Number);
    const horaInicioDate = new Date(Date.UTC(1970, 0, 1, horaIngresada, minutosIngresados, 0, 0));

    // Validar "hoy" en Buenos Aires, independientemente de la TZ del servidor
    const timeZone = 'America/Argentina/Buenos_Aires';
    const ahoraBA = dateTimePartsInTimeZone(new Date(), timeZone);
    const hoyUTC = new Date(Date.UTC(ahoraBA.year, ahoraBA.month - 1, ahoraBA.day, 0, 0, 0, 0));

    if (fechaDate < hoyUTC) {
      throw new BadRequestException('La fecha del turno no puede ser anterior al día actual');
    }

    // Escenario 6: si la fecha es hoy (BA), validar que el horario sea posterior al actual (BA)
    if (fechaDate.getTime() === hoyUTC.getTime()) {
      const horaActualMinutos = ahoraBA.hour * 60 + ahoraBA.minute;
      const horaIngresadaMinutos = horaIngresada * 60 + minutosIngresados;
      
      if (horaIngresadaMinutos <= horaActualMinutos) {
        throw new BadRequestException('La fecha y horario del turno no puede ser anterior al día y horario actual');
      }
    }


    // Escenario 4: validar rango semanal (lunes a viernes).
    // getUTCDay() usa el día de la semana en UTC, que coincide con la fecha YYYY-MM-DD que almacenamos.
    // 0 = domingo, 1 = lunes, ..., 6 = sábado.
    const diaSemana = fechaDate.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
      throw new BadRequestException('El día se encuentra fuera del rango semanal');
    }

    // Escenario 3: validar rango horario (07:00 a 20:00, con cierre a las 21:00).
    // Como los turnos duran 60 min, el último válido es el de las 20:00 (termina a las 21:00).
    const [horas, minutos] = dto.hora_inicio.split(':').map(Number);
    const minutosDesdeMedianoche = horas * 60 + minutos;
    const minLimite = 7 * 60;   // 07:00 = 420
    const maxLimite = 20 * 60;  // 20:00 = 1200
    if (minutosDesdeMedianoche < minLimite || minutosDesdeMedianoche > maxLimite) {
      throw new BadRequestException('El horario se encuentra fuera del rango horario');
    }

    // Verificar que no exista YA la misma actividad en ese día y horario
    // (la combinación (fecha, hora_inicio, tipoActividad_id) es unique en el schema).
    const turnoExistente = await this.prisma.turno.findUnique({
      where: {
        fecha_hora_inicio_tipoActividad_id: {
          fecha: fechaDate,
          hora_inicio: horaInicioDate,
          tipoActividad_id: dto.tipoActividad_id,
        },
      },
    });

    if (turnoExistente) {
      throw new BadRequestException('La actividad ya existe en el día y horario seleccionado');
    }

    // Escenario 1: crear el turno
    await this.prisma.turno.create({
      data: {
        tipoActividad_id: dto.tipoActividad_id,
        fecha: fechaDate,
        hora_inicio: horaInicioDate,
        capacidad: dto.capacidad,
        cantidad_inscriptos: 0,
      },
    });

    return { message: 'Turno creado' };
  }

  // ============================================================
  // HU: Visualizar turnos (personal)
  // ============================================================

  // Cubre Escenarios 1 y 2: devuelve la lista de turnos de la fecha
  // (array vacío si no hay; el front muestra el mensaje correspondiente).
  async listarPorFecha(fechaStr: string) {
    const fecha = new Date(`${fechaStr}T00:00:00`);

    const turnos = await this.prisma.turno.findMany({
      where: { fecha },
      include: { tipoActividad: true },
      orderBy: { hora_inicio: 'asc' },
    });

    return turnos.map((t) => ({
      id: t.id,
      fecha: t.fecha,
      hora_inicio: t.hora_inicio,
      actividad: t.tipoActividad.nombre,
      capacidad: t.capacidad,
      cantidad_inscriptos: t.cantidad_inscriptos,
      espacios_libres: t.capacidad - t.cantidad_inscriptos,
      estado: t.estado,
    }));
  }

  // Cubre Escenario 3: detalle de un turno específico con reservas y espacios libres.
  async obtenerDetalle(id: number) {
    const turno = await this.prisma.turno.findUnique({
      where: { id },
      include: {
        tipoActividad: true,
        reservas: {
          where: { estado: { not: 'CANCELADA' } },
          include: {
            paciente: {
              include: {
                usuario: { select: { nombre: true, apellido: true } },
              },
            },
            pagos: { where: { estado: 'COMPLETADO' }, select: { id: true } },
          },
        },
      },
    });

    if (!turno) {
      throw new NotFoundException('El turno no existe');
    }

    return {
      id: turno.id,
      fecha: turno.fecha,
      hora_inicio: turno.hora_inicio,
      actividad: turno.tipoActividad.nombre,
      cantidad_reservas: turno.cantidad_inscriptos,
      espacios_libres: turno.capacidad - turno.cantidad_inscriptos,
      capacidad: turno.capacidad,
      estado: turno.estado,
      inscriptos: turno.reservas.map((r) => ({
        id: r.id,
        nombre: r.paciente.usuario.nombre,
        apellido: r.paciente.usuario.apellido,
        estado: r.estado,
        pagado: r.pagos.length > 0,
      })),
    };
  }

  async obtenerResumenReservasMes(mes: number, anio: number) {
    const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
    const primerDiaSiguienteMes = new Date(Date.UTC(anio, mes, 1));

    const turnos = await this.prisma.turno.findMany({
      where: {
        fecha: { gte: primerDia, lt: primerDiaSiguienteMes },
        cantidad_inscriptos: { gt: 0 },
      },
      include: {
        tipoActividad: true,
        reservas: {
          where: { estado: { not: 'CANCELADA' } },
          include: {
            pagos: { where: { estado: 'COMPLETADO' }, select: { id: true } },
          },
        },
      },
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    });

    return turnos.map((t) => {
      const y = t.fecha.getUTCFullYear();
      const m = String(t.fecha.getUTCMonth() + 1).padStart(2, '0');
      const d = String(t.fecha.getUTCDate()).padStart(2, '0');
      const h = String(t.hora_inicio.getUTCHours()).padStart(2, '0');
      const min = String(t.hora_inicio.getUTCMinutes()).padStart(2, '0');

      return {
        id: t.id,
        date: `${y}-${m}-${d}`,
        actividad: t.tipoActividad.nombre,
        hora_inicio: `${h}:${min}`,
        total_reservas: t.reservas.length,
        pagados: t.reservas.filter((r) => r.pagos.length > 0).length,
      };
    });
  }

  async obtenerDiasDeTurnosDisponilbles(mes: number, anio: number): Promise<number[]> {
  
  const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
  const primerDiaSiguienteMes = new Date(Date.UTC(anio, mes, 1));

  const turnosDelMes = await this.prisma.turno.findMany({
    where: {
      fecha: {
        gte: primerDia,             // Mayor o igual al día 1 del mes
        lt: primerDiaSiguienteMes,  // Menor estricto al día 1 del mes siguiente
      },
    },
    select: {
      fecha: true,
      capacidad: true,
      cantidad_inscriptos: true,
    },
  });

  const diasConCupo = turnosDelMes
    .filter(turno => turno.capacidad > turno.cantidad_inscriptos)
    .map(turno => turno.fecha.getUTCDate()); 

  const diasUnicos = [...new Set(diasConCupo)];
  return diasUnicos.sort((a, b) => a - b);
}
}