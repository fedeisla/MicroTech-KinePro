import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { EstadoReserva } from '@prisma/client';

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
        message: 'Reserva exitosa',
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
      // Regla HU: se debe reprogramar con 48h o más de anticipación al turno original.
      const horas = this.horasHastaTurno(reservaActual);
      if (horas < 48) {
        throw new BadRequestException('El límite de tiempo para reprogramar el turno no se alcanzó (mínimo 48 horas)');
      }

      // Regla HU: máximo 2 reprogramaciones.
      if (reservaActual.cant_reprogramaciones >= 2) {
        throw new BadRequestException('El paciente alcanzó el límite de reprogramaciones');
      }

      const nuevoTurno = await this.prisma.turno.findUnique({ where: { id: updateReservaDto.turno_id } });
      if (!nuevoTurno) throw new BadRequestException('El turno especificado no existe');

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

      // Evitar doble reserva en el mismo día (excluyendo la propia reserva)
      const yaTieneOtraEseDia = await this.prisma.reserva.findFirst({
        where: {
          paciente_id: pacienteId,
          id: { not: id },
          estado: EstadoReserva.CONFIRMADA,
          turno: { fecha: nuevoTurno.fecha },
        },
      });
      if (yaTieneOtraEseDia) {
        throw new BadRequestException('El paciente ya posee un turno confirmado para ese día');
      }

      try {
        const nuevoEstado =
          reservaActual.estado === EstadoReserva.CANCELADA ? EstadoReserva.CONFIRMADA : EstadoReserva.CONFIRMADA;

        await this.prisma.$transaction(async (tx) => {
          // decremento cupo del turno anterior
          await tx.turno.update({
            where: { id: reservaActual.turno_id },
            data: { cantidad_inscriptos: { decrement: 1 } },
          });

          // incremento cupo del nuevo turno
          await tx.turno.update({
            where: { id: nuevoTurno.id },
            data: { cantidad_inscriptos: { increment: 1 } },
          });

          const cantReprogramacionesNueva = reservaActual.cant_reprogramaciones + 1;
          await tx.reserva.update({
            where: { id },
            data: {
              turno_id: nuevoTurno.id,
              estado: nuevoEstado,
              cant_reprogramaciones: { increment: 1 },
            },
          });

          // Nota: la pérdida de descuento se maneja en otra HU. Devolvemos una bandera para el front.
          // Pierde descuento si llega a 2 reprogramaciones (o 2 ausencias, que se controla aparte).
          // No persistimos nada todavía.
          void cantReprogramacionesNueva;
        });
      } catch (error) {
        this.logger.error(`Error al reprogramar la reserva: ${String(error)}`);
        throw new InternalServerErrorException('Ocurrió un error inesperado al reprogramar el turno');
      }

      const cantReprogramaciones = reservaActual.cant_reprogramaciones + 1;
      const ausencias = await this.prisma.reserva.count({
        where: { paciente_id: pacienteId, estado: EstadoReserva.AUSENTE },
      });
      const pierdeDescuento = cantReprogramaciones >= 2 || ausencias >= 2;
      return { message: 'Turno reprogramado con éxito. Usted acumula ahora una reprogramación desde el turno original. En caso de volver a reprogramar, alcanzará el limite de reprogramaciones y perderá la posibilidad de recibir un descuento el próximo mes', cantReprogramaciones, pierdeDescuento };
    }

    // Caso 3: cambio de turno + estado: no soportado (evita ambigüedad)
    throw new BadRequestException('Operación no soportada');
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
        fecha: { in: fechasString.map(fecha => new Date(fecha)) }, 
      },
    });

    //Validar que el administrador haya creado esos turnos en el sistema
    if (turnos.length !== fechasString.length) {
      throw new BadRequestException('No hay turnos programados en el sistema para todas las fechas solicitadas en ese horario');
    }

    // Extraemos los IDs de los turnos que encontramos para usarlos en tu lógica
    const turnosIds = turnos.map(t => t.id);

    //Escenario 4: Validar capacidad para todos los turnos
    const turnosSinCupo = turnos.filter(t => t.cantidad_inscriptos >= t.capacidad);
    if (turnosSinCupo.length > 0) {
      throw new BadRequestException('No se encuentra disponibilidad de días para la fecha seleccionada');
    }

    // Escenario 5: Validar si el paciente ya tiene reserva en esas fechas exactas

    const where_condition = EstadoReserva.CONFIRMADA || EstadoReserva.PENDIENTE
    const fechasTurnos = turnos.map(t => t.fecha);
    const reservaExistente = await this.prisma.reserva.findFirst({
      where: {
        paciente_id: pacienteId,
        turno: { fecha: { in: fechasTurnos } },
        estado:  { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] }, 
      }
    });

    if (reservaExistente) {
      throw new BadRequestException('El paciente ya posee un turno para una actividad en el día y horario seleccionado');
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

        // ACÁ IRÍA LA LÓGICA DEL PAGO (redirige, genera el link, etc).
        // Si el pago falla o da error la promesa del pago, se lanza un throw Error, 
        // lo que hace que Prisma cancele esta transacción (rollback automático).
      });

      return {
        message: 'Reserva exitosa',
        descuentoAplicado: `${porcentajeDescuento}%`,
        cantidadTurnos: turnosIds.length
      };

    } catch (error) {
      this.logger.error(`Error al procesar la reserva fija: ${String(error)}`);
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado al procesar la reserva. Ningún cobro fue realizado. Por favor, intente nuevamente más tarde.'
      );
    }
  }

}