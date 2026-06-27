import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoListaEspera, EstadoReserva } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';


@Injectable()
export class ListaEsperaService {
  constructor(private prisma: PrismaService, private eventEmitter:EventEmitter2 ) {}


  async obtenerEstadoPaciente(pacienteId: number) {
  const espera = await this.prisma.listaEspera.findFirst({
    where: { paciente_id: pacienteId},
    include: { turno: true } 
  });

  if (!espera) return null;

  // Cálculo de personas adelante
  const personasAdelante = await this.prisma.listaEspera.count({
    where: {
      turno_id: espera.turno_id,
      fecha_anotacion: { lt: espera.fecha_anotacion }
    }
  });

  return { ...espera, personasAdelante };
}

  async inscribirPaciente(turnoId: number, pacienteId: number, prioridad: number) {
    const turno = await this.prisma.turno.findUnique({ where: { id: turnoId } });
    if (!turno) throw new NotFoundException('El turno no existe.');

    const existente = await this.prisma.listaEspera.findFirst({
      where: {
        turno_id: turnoId,
        paciente_id: pacienteId,
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      }
    });
    if (existente) throw new BadRequestException('El paciente ya se encuentra registrado en la lista de espera');

    const config = await this.prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const porcentaje = config?.porcentajeListaEspera || 20;
    let limiteLista = Math.floor((turno.capacidad * (porcentaje / 100)) / 2);

    if (limiteLista === 0 && turno.capacidad > 0 && porcentaje > 0) {
      limiteLista = 1;
    }

    const ocupacionActual = await this.prisma.listaEspera.count({
      where: { turno_id: turnoId, prioridad, estado: EstadoListaEspera.PENDIENTE }
    });

    if (ocupacionActual >= limiteLista) {
      throw new BadRequestException('La capacidad máxima de la lista está completa.');
    }

    return await this.prisma.listaEspera.create({
      data: { turno_id: turnoId, paciente_id: pacienteId, prioridad }
    });
  }

  async cancelarEspera(id: number) {
    const espera = await this.prisma.listaEspera.findUnique({ where: { id } });
    if (!espera || espera.estado !== EstadoListaEspera.PENDIENTE) {
      throw new BadRequestException('La solicitud no existe o ya fue procesada.');
    }

    return await this.prisma.listaEspera.update({
      where: { id },
      data: { estado: EstadoListaEspera.CANCELADO }
    });
  }

  async confirmarTurno(id: number, acepta: boolean) {
    // 1. Validar que la solicitud exista y esté en estado NOTIFICADO
    const espera = await this.prisma.listaEspera.findUnique({ where: { id } });
    if (!espera || espera.estado !== EstadoListaEspera.NOTIFICADO) {
      throw new BadRequestException('No tienes turnos pendientes de confirmación válidos.');
    }

    // 2. CASO: El paciente RECHAZA el turno ofrecido
    if (!acepta) {
      await this.prisma.listaEspera.update({
        where: { id },
        data: { estado: EstadoListaEspera.CANCELADO }
      });

      // ACTIVAR EL MOTOR: Como el paciente lo rechazó, avisamos inmediatamente
      // para que el MotorMatchService busque al siguiente en la fila
      this.eventEmitter.emit('turno.liberado', { turnoId: espera.turno_id });

      return { message: 'Turno rechazado correctamente.' };
    }

    // 3. CASO: El paciente ACEPTA el turno
    // Usamos una transacción para asegurar que se cree la reserva y se actualice la lista de espera de forma atómica
    return await this.prisma.$transaction(async (tx) => {
      
      // Creamos la reserva en estado PENDIENTE de pago (MercadoPago se encargará de confirmarla)
      const nuevaReserva = await tx.reserva.create({
        data: {
          turno_id: espera.turno_id,       // Verifica si en tu modelo Reserva usas turnoId o turno_id
          paciente_id: espera.paciente_id, // Usa el ID del paciente (en tu objeto espera figura como paciente_id)
          fecha_reserva: new Date(),
          estado: EstadoReserva.PENDIENTE // Inicializa en PENDIENTE
        }
      });
      
      // Actualizamos el registro de la lista de espera a ASIGNADO
      await tx.listaEspera.update({
        where: { id },
        data: { estado: EstadoListaEspera.ASIGNADO }
      });
      await tx.turno.update({
        where: { id: espera.turno_id },
        data: {
          cantidad_inscriptos: { increment: 1 }
        }
      });

      // IMPORTANTE: Retornamos el reservaId. Esto es lo que el frontend lee 
      // para pasárselo a crearPreferenceMP(resReserva.reservaId)
      return {
        reservaId: nuevaReserva.id,
        estado: nuevaReserva.estado
      };
    });
  }
  
}