import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoListaEspera, EstadoReserva } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class ListaEsperaService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  private async obtenerHorasExpiracion(): Promise<number> {
    const config = await this.prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    return config?.horasExpiracionEspera ?? 12;
  }

  private obtenerFechaExpiracion(
    fechaNotificacion: Date | null | undefined,
    horasLimite: number,
  ): string | null {
    if (!fechaNotificacion) return null;
    return new Date(
      fechaNotificacion.getTime() + horasLimite * 60 * 60 * 1000,
    ).toISOString();
  }


  async obtenerEstadosPaciente(pacienteId: number) {
    const esperas = await this.prisma.listaEspera.findMany({
      where: {
        paciente_id: pacienteId,
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      },
      include: { 
        turno: {
          include: { tipoActividad: true }
        } 
      },
      orderBy: { fecha_anotacion: 'desc' }
    });

    if (!esperas || esperas.length === 0) return [];

    const horasLimite = await this.obtenerHorasExpiracion();

    // 2. Calculamos las personas por delante para CADA UNA de las solicitudes
    const resultados = await Promise.all(
      esperas.map(async (espera) => {
        const personasAdelante = await this.prisma.listaEspera.count({
          where: {
            turno_id: espera.turno_id,
            estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] },
            OR: [
              { 
                prioridad: { lt: espera.prioridad } 
              },
              { 
                prioridad: espera.prioridad,
                fecha_anotacion: { lt: espera.fecha_anotacion } 
              }
            ]
          }
        });

        const resultado: Record<string, unknown> = { ...espera, personasAdelante };

        if (espera.estado === EstadoListaEspera.NOTIFICADO) {
          const fechaExpiracion = this.obtenerFechaExpiracion(espera.fecha_notificacion, horasLimite);
          if (fechaExpiracion) resultado.fechaExpiracion = fechaExpiracion;
        }

        return resultado;
      })
    );

    return resultados;
  }

 async obtenerEstadoPaciente(pacienteId: number) {
    const espera = await this.prisma.listaEspera.findFirst({
      where: {
        paciente_id: pacienteId,
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      },
      include: { turno: true },
      orderBy: { fecha_anotacion: 'desc' }
    });

    if (!espera) return null;

    const personasAdelante = await this.prisma.listaEspera.count({
      where: {
        turno_id: espera.turno_id,
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] },
        OR: [
          { 
            prioridad: { lt: espera.prioridad } 
          },
          { 
            prioridad: espera.prioridad,
            fecha_anotacion: { lt: espera.fecha_anotacion } 
          }
        ]
      }
    });

    return { ...espera, personasAdelante };
  }

async inscribirPaciente(turnoId: number, pacienteId: number, prioridad: number) {
  const turno = await this.prisma.turno.findUnique({ where: { id: turnoId } });
  if (!turno) throw new NotFoundException('El turno no existe.');

  this.validarTurnoNoPasado(turno);

  // Validar que no tenga reservas activas (CONFIRMADA o PENDIENTE) ese mismo día y horario
  const reservaMismoDiaYHorario = await this.prisma.reserva.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: { in: [EstadoReserva.PENDIENTE, EstadoReserva.CONFIRMADA] },
      turno: {
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
      },
    },
  });

  if (reservaMismoDiaYHorario) {
    throw new BadRequestException('El paciente ya posee un turno activo para el día y horario seleccionado.');
  }

  // Validar que no esté ya en la lista de espera para ese mismo día y horario
  const esperaMismoDiaYHorario = await this.prisma.listaEspera.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] },
      turno: {
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
      },
    },
  });

  if (esperaMismoDiaYHorario) {
    throw new BadRequestException('El paciente ya se encuentra registrado en una lista de espera para el día y horario seleccionado.');
  }

  // 3. Lógica de capacidad de la lista
  const config = await this.prisma.configuracionSistema.findUnique({ where: { id: 1 } });
  const porcentaje = config?.porcentajeListaEspera || 20;
  let limiteLista = Math.floor((turno.capacidad * (porcentaje / 100)) / 2);

  if (limiteLista === 0 && turno.capacidad > 0 && porcentaje > 0) limiteLista = 1;

  const ocupacionActual = await this.prisma.listaEspera.count({
    where: { turno_id: turnoId, prioridad, estado: EstadoListaEspera.PENDIENTE }
  });

  if (ocupacionActual >= limiteLista) {
    throw new BadRequestException('La lista de espera se encuentra completa.');
  }

  // Inscripción
  return await this.prisma.listaEspera.create({
    data: { turno_id: turnoId, paciente_id: pacienteId, prioridad }
  });
}

  async inscribirTurnoFijoVirtual(pacienteId: number, turnoInicialId: number, fechasString: string[]) {

    return await this._registrarBloqueFijo(pacienteId, turnoInicialId, fechasString, 1);
  }

  async inscribirTurnoFijoPresencial(email: string, turnoInicialId: number, fechasString: string[], prioridad: number) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { usuario: { email } }
    });
    
    if (!paciente) {
      throw new NotFoundException(`No se encontró un paciente registrado con el email: ${email}`);
    }

    return await this._registrarBloqueFijo(paciente.id, turnoInicialId, fechasString, prioridad);
  }

  private async _registrarBloqueFijo(pacienteId: number, turnoInicialId: number, fechasString: string[], prioridad: number) {
    const turnoBase = await this.prisma.turno.findUnique({
      where: { id: turnoInicialId },
    });

    if (!turnoBase) {
      throw new BadRequestException('El turno inicial seleccionado no existe');
    }

    // 2. Buscar en la BD todos los turnos del bloque
    const turnos = await this.prisma.turno.findMany({
      where: {
        tipoActividad_id: turnoBase.tipoActividad_id,
        hora_inicio: turnoBase.hora_inicio, 
        fecha: { in: fechasString.map((fecha) => this.parseFechaYYYYMMDD(fecha)) },
      },
    });

    if (turnos.length !== fechasString.length) {
      throw new BadRequestException('Algunos de los turnos del bloque no se encontraron en la base de datos');
    }

    for (const turno of turnos) {
      this.validarTurnoNoPasado(turno);
    }

    const turnoIds = turnos.map(t => t.id);

    const hayAlgunoLleno = turnos.some(t => t.cantidad_inscriptos >= t.capacidad);
    
    if (!hayAlgunoLleno) {
      throw new BadRequestException('Para solicitar un turno fijo, al menos una de las fechas debe estar llena.');
    }
    const existente = await this.prisma.listaEspera.findFirst({
      where: {
        paciente_id: pacienteId,
        turno_id: { in: turnoIds },
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      }
    });
    
    if (existente) {
      throw new BadRequestException('El paciente ya tiene una solicitud activa en uno de estos turnos.');
    }

    const grupoId = crypto.randomUUID(); 
    return await this.prisma.$transaction(
      turnoIds.map(tid => 
        this.prisma.listaEspera.create({
          data: { 
            turno_id: tid, 
            paciente_id: pacienteId, 
            prioridad: prioridad, 
            grupo_fijo_id: grupoId 
          }
        })
      )
    );
  }


  async cancelarEspera(id: number) {
    const espera = await this.prisma.listaEspera.findUnique({ where: { id } });
    if (!espera || espera.estado !== EstadoListaEspera.PENDIENTE) {
      throw new BadRequestException('La solicitud no existe o ya fue procesada.');
    }
    return await this.prisma.listaEspera.update({ where: { id }, data: { estado: EstadoListaEspera.CANCELADO } });
  }

  async cancelarEsperaAdmin(id: number) {
    const espera = await this.prisma.listaEspera.findUnique({ where: { id } });
    if (!espera) throw new NotFoundException(`El registro de espera #${id} no existe.`);
    return await this.prisma.listaEspera.update({ where: { id }, data: { estado: EstadoListaEspera.CANCELADO } });
  }

  async confirmarTurno(id: number, acepta: boolean) {
    
    const esperaInicial = await this.prisma.listaEspera.findUnique({ where: { id } });
    
    if (!esperaInicial || esperaInicial.estado !== EstadoListaEspera.NOTIFICADO) {
      throw new BadRequestException('No tienes turnos pendientes de confirmación válidos.');
    }

    const solicitudesAProcesar = esperaInicial.grupo_fijo_id
      ? await this.prisma.listaEspera.findMany({
          where: { 
            grupo_fijo_id: esperaInicial.grupo_fijo_id,
            estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
          }
        })
      : [esperaInicial];

    const listaEsperaIds = solicitudesAProcesar.map(s => s.id);
    const turnoIds = solicitudesAProcesar.map(s => s.turno_id);
    const pacienteId = esperaInicial.paciente_id;

    if (!acepta) {
      await this.prisma.listaEspera.updateMany({
        where: { id: { in: listaEsperaIds } },
        data: { estado: EstadoListaEspera.CANCELADO }
      });

      for (const turnoId of turnoIds) {
        this.eventEmitter.emit('turno.liberado', { turnoId });
      }

      return { message: esperaInicial.grupo_fijo_id ? 'Bloque de turnos fijos rechazado correctamente.' : 'Turno rechazado correctamente.' };
    }

    const cancelaciones = await this.prisma.reserva.count({
      where: { 
        paciente_id: pacienteId, 
        estado: { in: [EstadoReserva.CANCELADA, EstadoReserva.AUSENTE] } 
      }
    });

    const reservasConReprogramacion = await this.prisma.reserva.findMany({
      where: { paciente_id: pacienteId, cant_reprogramaciones: { gt: 0 } },
      select: { cant_reprogramaciones: true }
    });
    const totalReprogramaciones = reservasConReprogramacion.reduce((acc, curr) => acc + curr.cant_reprogramaciones, 0);


    const configDesc = await this.prisma.configuracionDescuento.findFirst();
    const porcentajeConfigurado = configDesc?.porcentaje || 0;

    const aplicaDescuento = cancelaciones < 2 && totalReprogramaciones < 2;
    const porcentajeFinal = aplicaDescuento ? porcentajeConfigurado : 0;



    return await this.prisma.$transaction(async (tx) => {
      
      const reservaIds: number[] = [];


      const turnosData = await tx.turno.findMany({
        where: { id: { in: turnoIds } },
        select: { 
          tipoActividad: { 
            select: { precio: true } 
          } 
        }
      });

      const subtotal = turnosData.reduce((acc, t) => acc + (Number(t.tipoActividad.precio) || 0), 0);
      
  
      const montoTotal = subtotal - (subtotal * (Number(porcentajeFinal) / 100));

  
      for (const solicitud of solicitudesAProcesar) {
        const nuevaReserva = await tx.reserva.create({
          data: {
            turno_id: solicitud.turno_id,
            paciente_id: solicitud.paciente_id,
            fecha_reserva: new Date(),
            estado: EstadoReserva.PENDIENTE
          }
        });
        reservaIds.push(nuevaReserva.id);
      }

    
      await tx.listaEspera.updateMany({
        where: { id: { in: listaEsperaIds } },
        data: { estado: EstadoListaEspera.ASIGNADO }
      });

    
      for (const turnoId of turnoIds) {
        await tx.turno.update({
          where: { id: turnoId },
          data: { cantidad_inscriptos: { increment: 1 } }
        });
      }

     
      return {
        message: esperaInicial.grupo_fijo_id ? 'Turno fijo confirmado con éxito.' : 'Turno confirmado con éxito.',
        cantidadReservas: solicitudesAProcesar.length,
        reservaIds: reservaIds,
        reservaId: reservaIds[0], 
        montoTotal: montoTotal,
        aplicaDescuento: aplicaDescuento,
        porcentajeAplicado: porcentajeFinal
      };
    });
  }

  async obtenerListaParaAdmin(turnoId: number) {
    return await this.prisma.listaEspera.findMany({
      where: { 
        turno_id: turnoId,
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] } 
      },
      include: { paciente: { include: { usuario: true } } },
      orderBy: [{ prioridad: 'asc' }, { fecha_anotacion: 'asc' }]
    });
  }

  async inscribirPorEmail(turnoId: number, email: string, prioridad: number) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { usuario: { email: email } }
    });
    if (!paciente) throw new NotFoundException(`No se encontró un paciente registrado con el email: ${email}`);
    return this.inscribirPaciente(turnoId, paciente.id, prioridad);
  }


  private validarTurnoNoPasado(turno: { fecha: Date; hora_inicio: Date }) {
    const turnoFechaHora = new Date(Date.UTC(
      turno.fecha.getUTCFullYear(),
      turno.fecha.getUTCMonth(),
      turno.fecha.getUTCDate(),
      turno.hora_inicio.getUTCHours(),
      turno.hora_inicio.getUTCMinutes(),
      0,
      0,
    ));

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
    const siguienteHoraValida = new Date(Date.UTC(
      ahoraBA.getUTCFullYear(),
      ahoraBA.getUTCMonth(),
      ahoraBA.getUTCDate(),
      ahoraBA.getUTCHours() + 1,
      0,
      0,
      0,
    ));

    if (turnoFechaHora.getTime() < siguienteHoraValida.getTime()) {
      throw new BadRequestException('No es posible realizar una solicitud en un turno expirado o en transcurso');
    }
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
}