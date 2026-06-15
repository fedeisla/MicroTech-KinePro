import { BadRequestException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { EstadoReserva, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReservaService {
  constructor(private prisma: PrismaService) {}
  private readonly logger = new Logger(ReservaService.name);

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
  if (turnoFechaHora.getTime() <= Date.now()) {
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
        estado: EstadoReserva.CONFIRMADA, 
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
      await this.prisma.$transaction(async (tx) => {
        await tx.reserva.create({
          data: {
            estado: 'CONFIRMADA',        
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

      return {
        message: '¡Turno reservado con éxito!',
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
    reservaActual: { id: number; paciente_id: number; turno_id: number; cant_reprogramaciones: number; estado: EstadoReserva; turno: { fecha: Date; hora_inicio: Date } },
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

    const nuevoTurno = await this.prisma.turno.findUnique({ where: { id: nuevoTurnoId } });
    if (!nuevoTurno) throw new BadRequestException('El turno especificado no existe');

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
    try {
      await this.cancelarReserva(id, reservaActual.turno_id);
    } catch (error) {
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

  
  async crearReservaFija(pacienteId: number, turnoInicialId: number, fechasString: string[]) {


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

    const aplicaDescuento = ausencias < 2 && totalReprogramaciones < 2;
    const porcentajeDescuento = aplicaDescuento ? 20 : 0;

    //Escenario 6 
    try {
      await this.prisma.$transaction(async (tx) => {
        
        // Armamos el array de datos para crear múltiples reservas en bloque
        const reservasData = turnosIds.map(turnoId => ({
          paciente_id: pacienteId,
          turno_id: turnoId,
          estado: EstadoReserva.CONFIRMADA, 
        }));

        await tx.reserva.createMany({
          data: reservasData,
        });

        // Actualizamos los inscriptos de los turnos seleccionados
        for (const turnoId of turnosIds) {
          await tx.turno.update({
            where: { id: turnoId },
            data: { cantidad_inscriptos: { increment: 1 } },
          });
        }

        // Guardar el descuento si corresponde (para auditoría y futuros pagos)
        if (aplicaDescuento) {
          const ahora = new Date();
          // Obtener el primer día del mes actual para mes_aplicable
          const mesAplicable = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
          
          await tx.descuento.create({
            data: {
              paciente_id: pacienteId,
              porcentaje: new Decimal(20),
              motivo: 'Reserva de turnos fijos sin ausencias ni reprogramaciones',
              mes_aplicable: mesAplicable,
              utilizado: false,
            }
          });
        }

        // ACÁ IRÍA LA LÓGICA DEL PAGO (redirige, genera el link, etc).
        // Si el pago falla o da error la promesa del pago, se lanza un throw Error, 
        // lo que hace que Prisma cancele esta transacción (rollback automático).
      });

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
        cantidadTurnos: turnosIds.length
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

    return this.create(createReservaDto, usuario.paciente.id);
  }

  // Permite al personal administrativo u owner crear reservas fijas indicando el email del paciente
  async crearReservaFijaForEmail(email: string, turnoInicialId: number, fechasString: string[]) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { paciente: true },
    });

    if (!usuario || !usuario.paciente) {
      throw new BadRequestException('El email no corresponde a un usuario registrado');
    }

    return this.crearReservaFija(usuario.paciente.id, turnoInicialId, fechasString);
  }


  async marcarAsistencia(reservaId: number, asistio: boolean) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { turno: true },
    })
  
    if (!reserva) {
      throw new NotFoundException('La reserva no existe')
    }
  
    if (reserva.estado !== EstadoReserva.CONFIRMADA) {
      throw new BadRequestException('Solo se puede marcar asistencia sobre reservas confirmadas')
    }
  
    // Regla HU: no se puede marcar antes de los 30 min previos al inicio.
    // (Retroactivo SÍ se permite, no hay cota superior.)
    const inicioTurno = this.buildTurnoDateTimeUTC(reserva.turno.fecha, reserva.turno.hora_inicio)
    const treintaMinAntes = new Date(inicioTurno.getTime() - 30 * 60 * 1000)
    const ahora = new Date()
  
    if (ahora < treintaMinAntes) {
      throw new BadRequestException('El turno aún no está habilitado para marcar asistencia')
    }
  
    const nuevoEstado = asistio ? EstadoReserva.ASISTIO : EstadoReserva.AUSENTE
  
    await this.prisma.reserva.update({
      where: { id: reservaId },
      data: { estado: nuevoEstado },
    })
  
    return {
      message: asistio ? 'Asistencia registrada' : 'Inasistencia registrada',
    }
  }


  async listarPorTurno(turnoId: number) {
    return this.prisma.reserva.findMany({
      where: {
        turno_id: turnoId,
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.ASISTIO, EstadoReserva.AUSENTE] },
      },
      include: {
        paciente: { include: { usuario: true } },
        turno: true,
      },
    })
  }

}