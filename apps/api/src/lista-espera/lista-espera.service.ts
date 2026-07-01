import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoListaEspera, EstadoReserva } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

@Injectable()
export class ListaEsperaService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  // ====================================================================
  // ─── MÉTODOS DE CONSULTA Y ESTADO ───────────────────────────────────
  // ====================================================================

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
        fecha_anotacion: { lt: espera.fecha_anotacion },
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      }
    });

    return { ...espera, personasAdelante };
  }

  // ====================================================================
  // ─── INSCRIPCIÓN POR DEMANDA (INDIVIDUAL) ───────────────────────────
  // ====================================================================

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

    if (limiteLista === 0 && turno.capacidad > 0 && porcentaje > 0) limiteLista = 1;

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

  // ====================================================================
  // ─── INSCRIPCIÓN FIJA (BLOQUES/GRUPOS) ──────────────────────────────
  // ====================================================================

  async inscribirTurnoFijoVirtual(pacienteId: number, turnoIds: number[]) {
    return await this._registrarBloqueFijo(pacienteId, turnoIds);
  }

  async inscribirTurnoFijoPresencial(email: string, turnoIds: number[]) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { usuario: { email } }
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    
    return await this._registrarBloqueFijo(paciente.id, turnoIds);
  }

  private async _registrarBloqueFijo(pacienteId: number, turnoIds: number[]) {
    // 1. Validar ocupación real de los turnos
    const turnos = await this.prisma.turno.findMany({
      where: { id: { in: turnoIds } },
      select: { id: true, cantidad_inscriptos: true, capacidad: true }
    });

    const hayAlgunoLleno = turnos.some(t => t.cantidad_inscriptos >= t.capacidad);
    if (!hayAlgunoLleno) {
      throw new BadRequestException('Para solicitar un turno fijo, al menos una de las fechas debe estar llena.');
    }

    // 2. Validar que no tenga inscripción activa en estos turnos
    const existente = await this.prisma.listaEspera.findFirst({
      where: {
        paciente_id: pacienteId,
        turno_id: { in: turnoIds },
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      }
    });
    if (existente) throw new BadRequestException('El paciente ya tiene una solicitud activa en uno de estos turnos.');

    // 3. Crear bloque
    const grupoId = crypto.randomUUID(); 
    return await this.prisma.$transaction(
      turnoIds.map(tid => 
        this.prisma.listaEspera.create({
          data: { turno_id: tid, paciente_id: pacienteId, prioridad: 1, grupo_fijo_id: grupoId }
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
    const espera = await this.prisma.listaEspera.findUnique({ where: { id } });
    if (!espera || espera.estado !== EstadoListaEspera.NOTIFICADO) {
      throw new BadRequestException('No tienes turnos pendientes de confirmación válidos.');
    }

    if (!acepta) {
      await this.prisma.listaEspera.update({ where: { id }, data: { estado: EstadoListaEspera.CANCELADO } });
      this.eventEmitter.emit('turno.liberado', { turnoId: espera.turno_id });
      return { message: 'Turno rechazado correctamente.' };
    }

    return await this.prisma.$transaction(async (tx) => {
      const nuevaReserva = await tx.reserva.create({
        data: {
          turno_id: espera.turno_id,
          paciente_id: espera.paciente_id,
          fecha_reserva: new Date(),
          estado: EstadoReserva.PENDIENTE
        }
      });
      
      await tx.listaEspera.update({ where: { id }, data: { estado: EstadoListaEspera.ASIGNADO } });
      await tx.turno.update({
        where: { id: espera.turno_id },
        data: { cantidad_inscriptos: { increment: 1 } }
      });
      return { reservaId: nuevaReserva.id, estado: nuevaReserva.estado };
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
}