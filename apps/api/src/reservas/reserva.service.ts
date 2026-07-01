import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificacionesService } from '@/notificaciones/notificaciones.service';
import { MailService } from '@/mail/mail.service';
import { EstadoReserva, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfiguracionService } from '@/configuracion/configuracion.service';

@Injectable()
export class ReservaService {
  constructor(private prisma: PrismaService, private notificacionesService: NotificacionesService, private mailService: MailService, private eventEmitter: EventEmitter2,, private configuracionService: ConfiguracionService,) {}
  private readonly logger = new Logger(ReservaService.name);

  private async crearNotificacionReservaCreada(
    pacienteId: number,
    reservaId: number,
    turno: { fecha: Date; hora_inicio: Date },
    actividadNombre: string,
    email?: string,
  ) {
    if (!email) return;

    const fechaTurno = new Date(Date.UTC(
      turno.fecha.getUTCFullYear(),
      turno.fecha.getUTCMonth(),
      turno.fecha.getUTCDate(),
      turno.hora_inicio.getUTCHours(),
      turno.hora_inicio.getUTCMinutes(),
    ));
    const fechaStr = fechaTurno.toLocaleDateString('es-AR');
    const horaStr = turno.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turno.hora_inicio.getUTCMinutes().toString().padStart(2, '0');

    await this.notificacionesService.crearNotificacion({
      pacienteId,
      reservaId,
      titulo: 'Turno reservado',
      descripcion: `Su turno para la actividad ${actividadNombre} ha sido reservado para el día ${fechaStr} a las ${horaStr}hs.`,
      tipo: 'INFORMATIVA',
      canal: 'EMAIL',
      enviarEmail: true,
      email,
    });
  }

  private async crearNotificacionReservaCancelada(
    pacienteId: number,
    reservaId: number,
    turno: { fecha: Date; hora_inicio: Date },
    actividadNombre: string,
    email?: string,
  ) {
    if (!email) return;

    const fechaTurno = new Date(Date.UTC(
      turno.fecha.getUTCFullYear(),
      turno.fecha.getUTCMonth(),
      turno.fecha.getUTCDate(),
      turno.hora_inicio.getUTCHours(),
      turno.hora_inicio.getUTCMinutes(),
    ));
    const fechaStr = fechaTurno.toLocaleDateString('es-AR');
    const horaStr = turno.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turno.hora_inicio.getUTCMinutes().toString().padStart(2, '0');

    await this.notificacionesService.crearNotificacion({
      pacienteId,
      reservaId,
      titulo: 'Turno cancelado',
      descripcion: `Su turno para la actividad ${actividadNombre} el día ${fechaStr} a las ${horaStr}hs fue cancelado.`,
      tipo: 'CANCELACION_TURNO',
      canal: 'EMAIL',
      enviarEmail: true,
      email,
    });
  }

  private async crearNotificacionReservaReprogramada(
    pacienteId: number,
    reservaId: number,
    turnoAnterior: { fecha: Date; hora_inicio: Date },
    turnoNuevo: { fecha: Date; hora_inicio: Date },
    actividadNombre: string,
    email?: string,
  ) {
    if (!email) return;

    const fechaVieja = new Date(Date.UTC(
      turnoAnterior.fecha.getUTCFullYear(),
      turnoAnterior.fecha.getUTCMonth(),
      turnoAnterior.fecha.getUTCDate(),
      turnoAnterior.hora_inicio.getUTCHours(),
      turnoAnterior.hora_inicio.getUTCMinutes(),
    ));
    const fechaNueva = new Date(Date.UTC(
      turnoNuevo.fecha.getUTCFullYear(),
      turnoNuevo.fecha.getUTCMonth(),
      turnoNuevo.fecha.getUTCDate(),
      turnoNuevo.hora_inicio.getUTCHours(),
      turnoNuevo.hora_inicio.getUTCMinutes(),
    ));

    const fechaViejaStr = fechaVieja.toLocaleDateString('es-AR');
    const horaViejaStr = turnoAnterior.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turnoAnterior.hora_inicio.getUTCMinutes().toString().padStart(2, '0');
    const fechaNuevaStr = fechaNueva.toLocaleDateString('es-AR');
    const horaNuevaStr = turnoNuevo.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turnoNuevo.hora_inicio.getUTCMinutes().toString().padStart(2, '0');

    await this.notificacionesService.crearNotificacion({
      pacienteId,
      reservaId,
      titulo: 'Turno reprogramado',
      descripcion: `Su turno para la actividad ${actividadNombre} el día ${fechaViejaStr} a las ${horaViejaStr}hs fue reprogramado para el día ${fechaNuevaStr} a las ${horaNuevaStr}hs.`,
      tipo: 'INFORMATIVA',
      canal: 'EMAIL',
      enviarEmail: true,
      email,
    });
  }

  private buildTurnoDateTimeUTC(fecha: Date, horaInicio: Date) {
    const y = fecha.getUTCFullYear();
    const m = fecha.getUTCMonth();
    const d = fecha.getUTCDate();
    const hh = horaInicio.getUTCHours();
    const mm = horaInicio.getUTCMinutes();
    return new Date(Date.UTC(y, m, d, hh, mm, 0, 0));
  }

  private parseFechaYYYYMMDD(fecha: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!m) {
      throw new BadRequestException('La fecha debe estar en formato YYYY-MM-DD');
    }
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  private mismaFechaYHoraTurno(
    fechaA: Date,
    horaA: Date,
    fechaB: Date,
    horaB: Date,
  ): boolean {
    return (
      fechaA.getUTCFullYear() === fechaB.getUTCFullYear() &&
      fechaA.getUTCMonth() === fechaB.getUTCMonth() &&
      fechaA.getUTCDate() === fechaB.getUTCDate() &&
      horaA.getUTCHours() === horaB.getUTCHours() &&
      horaA.getUTCMinutes() === horaB.getUTCMinutes()
    );
  }

  private horasHastaTurno(reserva: { turno: { fecha: Date; hora_inicio: Date } }) {
    const turnoDT = this.buildTurnoDateTimeUTC(reserva.turno.fecha, reserva.turno.hora_inicio);
    const now = new Date();
    return (turnoDT.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  private assertPuedeCancelarReserva(reserva: { turno: { fecha: Date; hora_inicio: Date } }) {
    const horas = this.horasHastaTurno(reserva);
    if (horas < 48) {
      throw new BadRequestException('No es posible cancelar porque restan menos de 48 horas para el inicio del turno');
    }
  }

  private async assertReservaEsDelPaciente(reservaId: number, pacienteId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { turno: true },
    });
    if (!reserva) throw new NotFoundException('La reserva no existe');
    if (reserva.paciente_id !== pacienteId) throw new ForbiddenException('No tiene permisos sobre esta reserva');
    return reserva;
  }

  async create(createReservaDto: CreateReservaDto, pacienteId: number) {
    // 1. Buscamos el turno
    const turno = await this.prisma.turno.findUnique({
      where: { id: createReservaDto.turno_id },
    });

    if (!turno) {
      throw new BadRequestException('El turno especificado no existe');
    }

  // CORRECCIÓN 1: Validamos según los inscriptos actuales vs la capacidad total
  if (turno.cantidad_inscriptos >= turno.capacidad) {
    throw new BadRequestException(
      'La actividad no posee cupos en el día y horario seleccionado',
    );
  }

  // CORRECCIÓN 2: no se puede reservar un turno que ya comenzó o ya pasó
    const turnoFechaHora = this.buildTurnoDateTimeUTC(turno.fecha, turno.hora_inicio);

    // Comparar usando la hora actual en Buenos Aires para evitar errores por TZ del servidor
    const partsNow = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const mapNow = new Map(partsNow.map((p) => [p.type, p.value]));
    const ahoraBA = new Date(Date.UTC(
      Number(mapNow.get('year')),
      Number(mapNow.get('month')) - 1,
      Number(mapNow.get('day')),
      Number(mapNow.get('hour')),
      Number(mapNow.get('minute')),
      0,
      0,
    ));

    if (turnoFechaHora.getTime() <= ahoraBA.getTime()) {
      throw new BadRequestException('No se puede reservar un turno en el pasado o que ya comenzó');
    }

    // 2. Validamos la actividad
    const actividad = await this.prisma.tipoActividad.findUnique({
      where: { id: turno.tipoActividad_id },
    });

    if (!actividad) {
      throw new BadRequestException('Debe seleccionar una actividad');
    }

    const tieneReserva = await this.prisma.reserva.findFirst({
      where: {
        paciente_id: pacienteId,
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] }, 
        turno: {
          fecha: turno.fecha,
          hora_inicio: turno.hora_inicio,
        },
      },
    });

    if (tieneReserva) {
      throw new BadRequestException(
        'El paciente ya posee un turno para una actividad en el día y horario seleccionado',
      );
    }

    // transaccion para poder evitar inconsistencias en la base de datos
    try {
      let nuevaReserva;
      await this.prisma.$transaction(async (tx) => {
        nuevaReserva = await tx.reserva.create({
          data: {
            estado: 'PENDIENTE',
            turno: {
              connect: { id: createReservaDto.turno_id }
            },
            paciente: {
              connect: { id: pacienteId }
            }
          },
        });

        await tx.turno.update({
          where: { id: createReservaDto.turno_id },
          data: {
            cantidad_inscriptos: { increment: 1 }
          },
        });

        // Acá iría la lógica del pago...
      });

      const paciente = await this.prisma.paciente.findUnique({
        where: { id: pacienteId },
        include: { usuario: true },
      });

      // No emitir notificación aquí porque la reserva está en PENDIENTE
      // La notificación se envía cuando se confirma el pago

      return {
        message: 'Reserva pendiente de pago',
        reservaId: nuevaReserva!.id,
      };

    } catch (error) {
      this.logger.error(`Error al procesar la transacción de la reserva: ${String(error)}`);
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al procesar la reserva. Ningún cobro fue realizado. Por favor, intente nuevamente más tarde.'
      );
    }
  }

  async findAll(id: number) {
    return this.prisma.reserva.findMany({
      where: { 
        paciente_id: id,
        estado: { not: EstadoReserva.CONFIRMADA }
      },
      include: {
        turno: {
          include: {
            tipoActividad: true 
          }
        } 
      }, 
      orderBy: {
        turno: {
          fecha: 'desc' 
        }
      }
    });
  }

  async findHistorial(pacienteId: number) {
    const hoy = new Date();
    return this.prisma.reserva.findMany({
      where: {
        paciente_id: pacienteId,
        OR: [
          { turno: { fecha: { lt: hoy } } },
          { estado: EstadoReserva.CANCELADA },
        ],
      },
      include: {
        turno: {
          include: { tipoActividad: true },
        },
      },
      orderBy: {
        turno: { fecha: 'desc' },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} reserva`;
  }

  async update(id: number, pacienteId: number, updateReservaDto: UpdateReservaDto) {
    const reservaActual = await this.assertReservaEsDelPaciente(id, pacienteId);

    const quiereCambiarTurno = typeof updateReservaDto.turno_id === 'number' && updateReservaDto.turno_id !== reservaActual.turno_id;
    const quiereCambiarEstado = typeof updateReservaDto.estado !== 'undefined' && updateReservaDto.estado !== reservaActual.estado;

    if (!quiereCambiarTurno && !quiereCambiarEstado) {
      return { message: 'Sin cambios' };
    }

    // Caso 1: solo cambio de estado (por ahora permitido únicamente a CANCELADA)
    if (!quiereCambiarTurno && quiereCambiarEstado) {
      if (updateReservaDto.estado !== EstadoReserva.CANCELADA) {
        throw new BadRequestException('Cambio de estado no permitido');
      }
      this.assertPuedeCancelarReserva(reservaActual);
      await this.cancelarReserva(id, reservaActual.turno_id);
      const ausencias = await this.prisma.reserva.count({
        where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
      });
      const horas = this.horasHastaTurno(reservaActual);
      const puedeReprogramar = horas >= 48 && ausencias < 2 && reservaActual.cant_reprogramaciones < 2;
      return { message: 'Reserva cancelada', puedeReprogramar };
    }

    // Caso 2: reprogramación (cambio de turno)
    if (quiereCambiarTurno) {
      return this.ejecutarReprogramacion(id, reservaActual, updateReservaDto.turno_id!);
    }

    // Caso 3: cambio de turno + estado: no soportado (evita ambigüedad)
    throw new BadRequestException('Operación no soportada');
  }

  async registrarAsistencia(reservaId: number, estado: EstadoReserva) {
    if (estado !== EstadoReserva.ASISTIO && estado !== EstadoReserva.AUSENTE) {
      throw new BadRequestException('El estado debe ser ASISTIO o AUSENTE');
    }

    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: {
        turno: true,
        paciente: { include: { usuario: true } },
      },
    });

    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }

    if (reserva.estado !== EstadoReserva.CONFIRMADA) {
      throw new BadRequestException('Solo se puede registrar la asistencia para reservas confirmadas');
    }

    const turnoDateTime = this.buildTurnoDateTimeUTC(reserva.turno.fecha, reserva.turno.hora_inicio);

    // Calcular 'ahora' en la zona de Buenos Aires para evitar desfasajes por TZ
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const map = new Map(parts.map((p) => [p.type, p.value]));
    const ahoraBA = new Date(Date.UTC(
      Number(map.get('year')),
      Number(map.get('month')) - 1,
      Number(map.get('day')),
      Number(map.get('hour')),
      Number(map.get('minute')),
      0,
      0,
    ));

    const minutosParaInicio = (turnoDateTime.getTime() - ahoraBA.getTime()) / (1000 * 60);

    if (minutosParaInicio > 30) {
      throw new BadRequestException('El control de asistencia al turno se habilitará 30 minutos antes de su horario de inicio');
    }

    // Actualizar la reserva con el estado de asistencia
    const reservaActualizada = await this.prisma.reserva.update({
      where: { id: reservaId },
      data: { estado },
    });

    // Si es ausencia, manejar la penalización
    if (estado === EstadoReserva.AUSENTE && reserva.paciente && reserva.paciente.usuario) {
      const primerDiaMes = new Date(Date.UTC(ahoraBA.getUTCFullYear(), ahoraBA.getUTCMonth(), 1));
      const primerDiaMesSiguiente = new Date(Date.UTC(ahoraBA.getUTCFullYear(), ahoraBA.getUTCMonth() + 1, 1));

      // Contar ausencias previas en el mes actual (sin incluir esta actual)
      const ausenciasPrevias = await this.prisma.reserva.count({
        where: {
          paciente_id: reserva.paciente_id,
          estado: EstadoReserva.AUSENTE,
          turno: {
            fecha: {
              gte: primerDiaMes,
              lt: primerDiaMesSiguiente,
            },
          },
          // Excluir la reserva actual que ya fue actualizada
          NOT: {
            id: reservaId,
          },
        },
      });

      // ausenciasPrevias es la cantidad ANTES de esta ausencia actual
      // Después de esta, serán ausenciasPrevias + 1
      const ausenciasTotales = ausenciasPrevias + 1;
      
      // Actualizar el campo ausenciasMesActual
      await this.prisma.paciente.update({
        where: { id: reserva.paciente_id },
        data: { ausenciasMesActual: ausenciasTotales },
      });

      // Enviar notificación SOLO si es la segunda ausencia del mes
      if (ausenciasPrevias === 1) {
        const mensaje = 'Alcanzaste el límite de ausencias mensuales y perdiste la posibilidad de recibir un descuento en la reserva de turnos fijos para el próximo mes';
        await this.notificacionesService.crearNotificacion({
          pacienteId: reserva.paciente_id,
          reservaId: reservaId,
          titulo: 'Límite de ausencias alcanzado',
          descripcion: mensaje,
          tipo: 'INFORMATIVA',
          canal: 'EMAIL',
          enviarEmail: true,
          email: reserva.paciente.usuario.email,
        });
      }

      return {
        message: 'Ausencia registrada',
        ausenciasMensuales: ausenciasTotales,
        penalizacionAplicada: ausenciasPrevias === 1,
      };
    }

    return {
      message: 'Asistencia registrada',
      ausenciasMensuales: 0,
      penalizacionAplicada: false,
    };
  }

  async reprogramarPresencial(reservaId: number, nuevoTurnoId: number) {
    const reserva = await this.assertReservaExiste(reservaId);
    if (reserva.estado === EstadoReserva.CANCELADA) {
      throw new BadRequestException('No es posible reprogramar una reserva cancelada');
    }
    return this.ejecutarReprogramacion(reservaId, reserva, nuevoTurnoId, true);
  }

  async cancelarPresencial(reservaId: number) {
    const reserva = await this.assertReservaExiste(reservaId);
    if (reserva.estado === EstadoReserva.CANCELADA) {
      return { message: 'Turno cancelado' };
    }
    this.assertPuedeCancelarReserva(reserva);
    try {
      await this.cancelarReserva(reservaId, reserva.turno_id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error al cancelar la reserva presencial: ${String(error)}`);
      throw new InternalServerErrorException('Ocurrió un error inesperado al cancelar el turno');
    }
    return { message: 'Turno cancelado' };
  }

  private async assertReservaExiste(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { turno: true },
    });
    if (!reserva) {
      throw new NotFoundException('La reserva no existe');
    }
    return reserva;
  }

  private mensajeReprogramacionExitosa(cantReprogramaciones: number, presencial = false): string {
    if (presencial) {
      if (cantReprogramaciones >= 2) {
        return 'Turno reprogramado con éxito. El paciente alcanzó el límite de reprogramaciones desde el turno original y perdió la posibilidad de recibir un descuento el próximo mes en turnos fijos';
      }
      return 'Turno reprogramado con éxito. El paciente acumula ahora una reprogramación desde el turno original. En caso de volver a reprogramar, el paciente alcanzará el limite de reprogramaciones y perderá la posibilidad de recibir un descuento el próximo mes';
    }
    if (cantReprogramaciones >= 2) {
      return 'Turno reprogramado con éxito. Usted alcanzó el límite de reprogramaciones desde el turno original y perdió la posibilidad de recibir un descuento el próximo mes en turnos fijos';
    }
    return 'Turno reprogramado con éxito. Usted acumula ahora una reprogramación desde el turno original. En caso de volver a reprogramar, alcanzará el limite de reprogramaciones y perderá la posibilidad de recibir un descuento el próximo mes';
  }

  private async ejecutarReprogramacion(
    reservaId: number,
    reservaActual: { id: number; paciente_id: number; turno_id: number; cant_reprogramaciones: number; estado: EstadoReserva; turno: { fecha: Date; hora_inicio: Date; tipoActividad_id: number } },
    nuevoTurnoId: number,
    presencial = false,
  ) {
    const horas = this.horasHastaTurno(reservaActual);
    if (horas < 48) {
      throw new BadRequestException('No es posible reprogramar porque restan menos de 48 horas para el inicio del turno');
    }

    if (reservaActual.cant_reprogramaciones >= 2) {
      throw new BadRequestException(
        presencial
          ? 'No es posible reprogramar este turno porque el paciente alcanzó el limite de reprogramaciones'
          : 'No es posible reprogramar este turno porque alcanzó el limite de reprogramaciones',
      );
    }

    const nuevoTurno = await this.prisma.turno.findUnique({ where: { id: nuevoTurnoId }, include: { tipoActividad: true } });
    if (!nuevoTurno) throw new BadRequestException('El turno especificado no existe');

    if (nuevoTurno.tipoActividad_id !== reservaActual.turno.tipoActividad_id) {
      throw new BadRequestException('No es posible reprogramar a un turno de otra actividad');
    }

    if (
      nuevoTurnoId === reservaActual.turno_id ||
      this.mismaFechaYHoraTurno(
        reservaActual.turno.fecha,
        reservaActual.turno.hora_inicio,
        nuevoTurno.fecha,
        nuevoTurno.hora_inicio,
      )
    ) {
      throw new BadRequestException(
        presencial
          ? 'No es posible reprogramar al mismo día y horario del turno actual'
          : 'No es posible reprogramar al mismo día y horario de su turno actual',
      );
    }

    const nuevoTurnoFechaHora = this.buildTurnoDateTimeUTC(nuevoTurno.fecha, nuevoTurno.hora_inicio);
    if (nuevoTurnoFechaHora.getTime() <= Date.now()) {
      throw new BadRequestException('No se puede reprogramar a un turno en el pasado o que ya comenzó');
    }

    if (nuevoTurno.estado === 'CANCELADO') {
      throw new BadRequestException('El turno seleccionado no se encuentra disponible');
    }
    if (nuevoTurno.cantidad_inscriptos >= nuevoTurno.capacidad) {
      throw new BadRequestException('El turno seleccionado no posee cupos disponibles');
    }

    const yaTieneConflicto = await this.prisma.reserva.findFirst({
      where: {
        paciente_id: reservaActual.paciente_id,
        id: { not: reservaId },
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] },
        turno: {
          fecha: nuevoTurno.fecha,
          hora_inicio: nuevoTurno.hora_inicio,
        },
      },
    });
    if (yaTieneConflicto) {
      throw new BadRequestException(
        presencial
          ? 'No es posible reprogramar porque el paciente ya posee otro turno en el día y horario solicitado'
          : 'No es posible reprogramar porque ya posee otro turno en el día y horario solicitado',
      );
    }

    try {
      const nuevoEstado = EstadoReserva.CONFIRMADA;

      await this.prisma.$transaction(async (tx) => {
        await tx.turno.update({
          where: { id: reservaActual.turno_id },
          data: { cantidad_inscriptos: { decrement: 1 } },
        });

        await tx.turno.update({
          where: { id: nuevoTurno.id },
          data: { cantidad_inscriptos: { increment: 1 } },
        });

        await tx.reserva.update({
          where: { id: reservaId },
          data: {
            turno_id: nuevoTurno.id,
            estado: nuevoEstado,
            cant_reprogramaciones: { increment: 1 },
          },
        });
      });

      await this.notificacionesService.cancelarNotificacionesDeReserva(reservaId);

      const paciente = await this.prisma.paciente.findUnique({
        where: { id: reservaActual.paciente_id },
        include: { usuario: true },
      });
      if (paciente && paciente.usuario) {
        const fechaNueva = new Date(Date.UTC(nuevoTurno.fecha.getUTCFullYear(), nuevoTurno.fecha.getUTCMonth(), nuevoTurno.fecha.getUTCDate(), nuevoTurno.hora_inicio.getUTCHours(), nuevoTurno.hora_inicio.getUTCMinutes()));
        const fechaEnvioRecordatorio = new Date(fechaNueva.getTime() - 24 * 60 * 60 * 1000);
        const fechaNuevaStr = fechaNueva.toLocaleDateString('es-AR');
        const horaNuevaStr = nuevoTurno.hora_inicio.getUTCHours().toString().padStart(2,'0')+':'+nuevoTurno.hora_inicio.getUTCMinutes().toString().padStart(2,'0');

        await this.crearNotificacionReservaReprogramada(
          reservaActual.paciente_id,
          reservaId,
          reservaActual.turno,
          {
            fecha: nuevoTurno.fecha,
            hora_inicio: nuevoTurno.hora_inicio,
          },
          nuevoTurno.tipoActividad?.nombre ?? '',
          paciente.usuario.email,
        );
        const tituloR = `Recordatorio de turno`;
        const descripcionR = `Recordatorio de turno confirmado para la actividad el día ${fechaNuevaStr} a las ${horaNuevaStr}hs.`;
        const enviarRecordatorioAhora = fechaEnvioRecordatorio.getTime() <= Date.now();
        await this.notificacionesService.crearNotificacion({
          pacienteId: reservaActual.paciente_id,
          reservaId,
          titulo: tituloR,
          descripcion: descripcionR,
          tipo: 'RECORDATORIO',
          canal: 'EMAIL',
          fechaEnvio: enviarRecordatorioAhora ? new Date() : fechaEnvioRecordatorio,
          enviarEmail: enviarRecordatorioAhora,
          email: paciente.usuario.email,
        });
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error al reprogramar la reserva: ${String(error)}`);
      throw new InternalServerErrorException('Ocurrió un error inesperado al reprogramar el turno');
    }

    const cantReprogramaciones = reservaActual.cant_reprogramaciones + 1;
    const ausencias = await this.prisma.reserva.count({
      where: { paciente_id: reservaActual.paciente_id, estado: EstadoReserva.AUSENTE },
    });
    const pierdeDescuento = cantReprogramaciones >= 2 || ausencias >= 2;

    return {
      message: this.mensajeReprogramacionExitosa(cantReprogramaciones, presencial),
      cantReprogramaciones,
      pierdeDescuento,
    };
  }

  // es para probar hasta que tengamos el pago
  async updateState(id: number, updateReservaDto: UpdateReservaDto) {
    return `This action updates a #${id} reserva`;
  }

  private async cancelarReserva(reservaId: number, turnoId: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.reserva.update({
        where: { id: reservaId },
        data: { estado: EstadoReserva.CANCELADA },
      });
      await tx.turno.update({
        where: { id: turnoId },
        data: { cantidad_inscriptos: { decrement: 1 } },
      });
    });
    this.eventEmitter.emit('turno.liberado', { turnoId });
    
   
    // Crear notificación de cancelación y enviar email
    try {
      await this.notificacionesService.cancelarNotificacionesDeReserva(reservaId);
      const reserva = await this.prisma.reserva.findUnique({ where: { id: reservaId }, include: { turno: { include: { tipoActividad: true } }, paciente: { include: { usuario: true } } } });
      if (reserva && reserva.paciente && reserva.paciente.usuario) {
        await this.crearNotificacionReservaCancelada(
          reserva.paciente.id,
          reserva.id,
          reserva.turno,
          reserva.turno.tipoActividad.nombre,
          reserva.paciente.usuario.email,
        );
      }
    } catch (err) {
      this.logger.error('Error creando notificacion de cancelacion: ' + String(err));
    }
  }

  async remove(id: number, pacienteId: number) {
    const reservaActual = await this.assertReservaEsDelPaciente(id, pacienteId);
    if (reservaActual.estado === EstadoReserva.CANCELADA) {
      const ausencias = await this.prisma.reserva.count({
        where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
      });
      const horas = this.horasHastaTurno(reservaActual);
      const puedeReprogramar = horas >= 48 && ausencias < 2 && reservaActual.cant_reprogramaciones < 2;
      return { message: 'La reserva ya estaba cancelada', puedeReprogramar };
    }
    this.assertPuedeCancelarReserva(reservaActual);
    try {
      await this.cancelarReserva(id, reservaActual.turno_id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error al cancelar la reserva: ${String(error)}`);
      throw new InternalServerErrorException('Ocurrió un error inesperado al cancelar el turno');
    }
    const ausencias = await this.prisma.reserva.count({
      where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
    });
    const horas = this.horasHastaTurno(reservaActual);
    const puedeReprogramar = horas >= 48 && ausencias < 2 && reservaActual.cant_reprogramaciones < 2;
      
    return { message: 'Reserva cancelada', puedeReprogramar };
  
    // NOTA: mantenemos el registro (no hard delete)
  }

  async filtrarReservas(pacienteId: number, estado: EstadoReserva) {
    const fechaActual = new Date();
    const WHERE_CLAUSE: any = { 
      paciente_id: pacienteId,
      estado: estado
    };

    if (estado === EstadoReserva.CONFIRMADA) {
      // Si está confirmada, queremos los turnos de hoy en adelante
      WHERE_CLAUSE.turno = { fecha: { gte: fechaActual } }; 
    } else {
      // Si son pasadas/canceladas, queremos los anteriores a hoy
      WHERE_CLAUSE.turno = { fecha: { lt: fechaActual } };
    }

    return this.prisma.reserva.findMany({
      where: WHERE_CLAUSE,
      include: {
        turno: {
          include: {
            tipoActividad: true 
          }
        }
      },
      orderBy: { 
        turno: {
          fecha: estado === EstadoReserva.CONFIRMADA ? 'asc' : 'desc'
        }
      }, 
    });
  }

  
  async crearReservaFija(
    pacienteId: number,
    turnoInicialId: number,
    fechasString: string[],
    estadoInicial: EstadoReserva = EstadoReserva.CONFIRMADA,
  ) {


    const turnoBase = await this.prisma.turno.findUnique({
      where: { id: turnoInicialId },
    });

    if (!turnoBase) {
      throw new BadRequestException('El turno inicial seleccionado no existe');
    }
    // 2. Buscar en la BD todos los turnos que coincidan con las fechas, horario y actividad
    // (Ajustá "actividad_id" y "hora_inicio" según cómo se llamen en tu schema.prisma)
    const turnos = await this.prisma.turno.findMany({
      where: {
        tipoActividad_id: turnoBase.tipoActividad_id,
        hora_inicio: turnoBase.hora_inicio, 
        // Convertimos los strings del front a Date para Prisma
        fecha: { in: fechasString.map((fecha) => this.parseFechaYYYYMMDD(fecha)) },
      },
    });

    if (turnos.length !== fechasString.length) {
      throw new BadRequestException('No se encuentra disponibilidad de días para la fecha seleccionada');
    }

    // Extraemos los IDs de los turnos que encontramos para usarlos en tu lógica
    const turnosIds = turnos.map(t => t.id);

    //Escenario 4: Validar capacidad para todos los turnos
    const turnosSinCupo = turnos.filter(t => t.cantidad_inscriptos >= t.capacidad);
    if (turnosSinCupo.length > 0) {
      throw new BadRequestException('No se encuentra disponibilidad de días para la fecha seleccionada');
    }

    // Escenario 5: Validar si el paciente ya tiene reserva en esas fechas y horarios exactos
    const fechasTurnos = turnos.map(t => t.fecha);
    const turnosConConflicto = await this.prisma.reserva.findFirst({
      where: {
        paciente_id: pacienteId,
        turno: {
          fecha: { in: fechasTurnos },
          hora_inicio: turnoBase.hora_inicio,
        },
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] },
      }
    });

    if (turnosConConflicto) {
      throw new BadRequestException('Ya posee un turno para una actividad en el día y horario seleccionado');
    }

    //Escenario 1, 2 y 3: Calcular el descuento
    const ausencias = await this.prisma.reserva.count({
      where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
    });

    // Buscar cuántas reprogramaciones tiene en su historial
    const reservasConReprogramacion = await this.prisma.reserva.findMany({
      where: { paciente_id: pacienteId, cant_reprogramaciones: { gt: 0 } },
      select: { cant_reprogramaciones: true }
    });
    
    const totalReprogramaciones = reservasConReprogramacion.reduce((acc, curr) => acc + curr.cant_reprogramaciones, 0);

    const { porcentaje: porcentajeConfigurado } = await this.configuracionService.obtenerDescuento();
    const aplicaDescuento = ausencias < 2 && totalReprogramaciones < 2;
    const porcentajeDescuento = aplicaDescuento ? porcentajeConfigurado : 0;

    const reservaIds: number[] = [];
    //Escenario 6 
    try {
      await this.prisma.$transaction(async (tx) => {
        
        // Creamos cada reserva individualmente para poder capturar sus IDs
        for (const turnoId of turnosIds) {
          const r = await tx.reserva.create({
            data: {
              paciente_id: pacienteId,
              turno_id: turnoId,
              estado: estadoInicial,
            },
          });
          reservaIds.push(r.id);
        }

        // Actualizamos los inscriptos de los turnos seleccionados
        for (const turnoId of turnosIds) {
          await tx.turno.update({
            where: { id: turnoId },
            data: { cantidad_inscriptos: { increment: 1 } },
          });
        }


        // ACÁ IRÍA LA LÓGICA DEL PAGO (redirige, genera el link, etc).
        // Si el pago falla o da error la promesa del pago, se lanza un throw Error, 
        // lo que hace que Prisma cancele esta transacción (rollback automático).
      });

      const paciente = await this.prisma.paciente.findUnique({
        where: { id: pacienteId },
        include: { usuario: true },
      });

      // Emitir notificaciones solo si la reserva fue creada en CONFIRMADA (presencial)
      if (estadoInicial === EstadoReserva.CONFIRMADA && paciente?.usuario) {
        for (let index = 0; index < reservaIds.length; index += 1) {
          const reservaId = reservaIds[index];
          const turnoCreado = turnos[index];
          if (turnoCreado) {
            await this.crearNotificacionReservaCreada(
              pacienteId,
              reservaId,
              turnoCreado,
              turnoBase.tipoActividad_id ? (await this.prisma.tipoActividad.findUnique({ where: { id: turnoBase.tipoActividad_id } }))?.nombre ?? 'actividad' : 'actividad',
              paciente.usuario.email,
            );
          }
        }
      }

      // Determinar el mensaje específico según el escenario
      let mensajeRespuesta: string;
      
      if (ausencias >= 2) {
        mensajeRespuesta = 'Reserva exitosa sin descuento aplicado por poseer dos ausencias';
      } else if (totalReprogramaciones >= 2) {
        mensajeRespuesta = 'Reserva exitosa sin descuento aplicado por poseer dos reprogramaciones';
      } else {
        mensajeRespuesta = 'Reserva exitosa con descuento aplicado';
      }

      return {
        message: mensajeRespuesta,
        descuentoAplicado: `${porcentajeDescuento}%`,
        cantidadTurnos: turnosIds.length,
        reservaIds
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error al procesar la reserva fija: ${String(error)}`);
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al procesar la reserva. Ningún cobro fue realizado. Por favor, intente nuevamente más tarde.'
      );
    }
  }

  // Permite al personal administrativo u owner crear una reserva (única) indicando el email del paciente
  async createForEmail(createReservaDto: CreateReservaDto, email: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { paciente: true },
    });

    if (!usuario || !usuario.paciente) {
      throw new BadRequestException('El email no corresponde a un usuario registrado');
    }

    // Para presencial, crear directamente en CONFIRMADA
    const turno = await this.prisma.turno.findUnique({
      where: { id: createReservaDto.turno_id },
      include: { tipoActividad: true },
    });

    if (!turno) {
      throw new BadRequestException('El turno especificado no existe');
    }

    const conflicto = await this.prisma.reserva.findFirst({
      where: {
        paciente_id: usuario.paciente!.id,
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] },
        turno: {
          fecha: turno.fecha,
          hora_inicio: turno.hora_inicio,
        },
      },
    });

    if (conflicto) {
      throw new BadRequestException('El paciente ya posee un turno para una actividad en el día y horario seleccionado');
    }

    try {
      let nuevaReserva: any;
      await this.prisma.$transaction(async (tx) => {
        nuevaReserva = await tx.reserva.create({
          data: {
            estado: 'CONFIRMADA',
            turno: {
              connect: { id: createReservaDto.turno_id }
            },
            paciente: {
              connect: { id: usuario.paciente!.id }
            }
          },
        });

        await tx.turno.update({
          where: { id: createReservaDto.turno_id },
          data: {
            cantidad_inscriptos: { increment: 1 }
          },
        });
      });

      // Emitir notificación de confirmación para presencial
      if (usuario.paciente) {
        await this.crearNotificacionReservaCreada(
          usuario.paciente.id,
          nuevaReserva!.id,
          turno,
          turno.tipoActividad.nombre,
          usuario.email,
        );
      }

      return {
        message: 'Reserva confirmada exitosamente',
        reservaId: nuevaReserva!.id,
      };
    } catch (error) {
      this.logger.error(`Error al procesar la reserva presencial: ${String(error)}`);
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al procesar la reserva.'
      );
    }
  }

  // Permite al personal administrativo u owner crear reservas fijas indicando el email del paciente
  async crearReservaFijaForEmail(email: string, turnoInicialId: number, fechasString: string[]) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { paciente: true },
    });

    if (!usuario || !usuario.paciente) {
      throw new BadRequestException('El email no corresponde a un paciente registrado');
    }

    // Para presencial, crear directamente en CONFIRMADA
    return this.crearReservaFija(usuario.paciente.id, turnoInicialId, fechasString, EstadoReserva.CONFIRMADA);
  }

  async chequearDescuento(email: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { paciente: true },
    });
  
    if (!usuario || !usuario.paciente) {
      throw new BadRequestException('El email no corresponde a un paciente registrado');
    }
  
    const pacienteId = usuario.paciente.id;
  
    const ausencias = await this.prisma.reserva.count({
      where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
    });
  
    const reservasConReprogramacion = await this.prisma.reserva.findMany({
      where: { paciente_id: pacienteId, cant_reprogramaciones: { gt: 0 } },
      select: { cant_reprogramaciones: true },
    });
  
    const totalReprogramaciones = reservasConReprogramacion.reduce(
      (acc, curr) => acc + curr.cant_reprogramaciones,
      0,
    );
  
    const aplica = ausencias < 2 && totalReprogramaciones < 2;
    const { porcentaje: porcentajeConfigurado } = await this.configuracionService.obtenerDescuento();
  
    return {
      aplica,
      porcentaje: aplica ? porcentajeConfigurado : 0,
      ausencias,
      totalReprogramaciones,
    };
  }

}