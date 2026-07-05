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

 

  /*async inscribirTurnoFijoPresencial(email: string, turnoIds: number[]) {
    const paciente = await this.prisma.paciente.findFirst({
      where: { usuario: { email } }
    });
    if (!paciente) throw new NotFoundException('Paciente no encontrado');
    
    return await this._registrarBloqueFijo(paciente.id, turnoIds);
  }*/
async inscribirTurnoFijoVirtual(pacienteId: number, turnoInicialId: number, fechasString: string[]) {
    return await this._registrarBloqueFijo(pacienteId, turnoInicialId, fechasString);
  }

  private async _registrarBloqueFijo(pacienteId: number, turnoInicialId: number, fechasString: string[]) {
    
    // 1. Buscar el turno base para obtener actividad y horario (Igual que en reservas fijas)
    const turnoBase = await this.prisma.turno.findUnique({
      where: { id: turnoInicialId },
    });

    if (!turnoBase) {
      throw new BadRequestException('El turno inicial seleccionado no existe');
    }

    // 2. Buscar en la BD todos los turnos del bloque (Trabaja idéntico a reservas fijas)
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

    // Extraemos los IDs de todo el bloque
    const turnoIds = turnos.map(t => t.id);

    // 3. Validar ocupación: Acá arranca el flujo si ALGUNO de los turnos que trajimos está lleno
    const hayAlgunoLleno = turnos.some(t => t.cantidad_inscriptos >= t.capacidad);
    
    if (!hayAlgunoLleno) {
      throw new BadRequestException('Para solicitar un turno fijo, al menos una de las fechas debe estar llena.');
    }

    // 4. Validar que no tenga inscripción activa en estos turnos
    const existente = await this.prisma.listaEspera.findFirst({
      where: {
        paciente_id: pacienteId,
        turno_id: { in: turnoIds },
        estado: { in: [EstadoListaEspera.PENDIENTE, EstadoListaEspera.NOTIFICADO] }
      }
    });
    if (existente) throw new BadRequestException('El paciente ya tiene una solicitud activa en uno de estos turnos.');

    // 5. Crear bloque
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
    // 1. Buscar la solicitud de lista de espera inicial
    const esperaInicial = await this.prisma.listaEspera.findUnique({ where: { id } });
    
    if (!esperaInicial || esperaInicial.estado !== EstadoListaEspera.NOTIFICADO) {
      throw new BadRequestException('No tienes turnos pendientes de confirmación válidos.');
    }

    // 2. Determinar si es parte de un bloque de turnos fijos
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

    // 3. Caso: El paciente RECHAZA el turno o el bloque fijo
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

    // 4. Lógica de Descuentos (Verificamos historial antes de la transacción)
    
    // a) Contar cancelaciones y ausencias
    const cancelaciones = await this.prisma.reserva.count({
      where: { 
        paciente_id: pacienteId, 
        estado: { in: [EstadoReserva.CANCELADA, EstadoReserva.AUSENTE] } 
      }
    });

    // b) Contar reprogramaciones totales
    const reservasConReprogramacion = await this.prisma.reserva.findMany({
      where: { paciente_id: pacienteId, cant_reprogramaciones: { gt: 0 } },
      select: { cant_reprogramaciones: true }
    });
    const totalReprogramaciones = reservasConReprogramacion.reduce((acc, curr) => acc + curr.cant_reprogramaciones, 0);

    // c) Traer el porcentaje de la tabla ConfiguracionDescuento
    const configDesc = await this.prisma.configuracionDescuento.findFirst();
    const porcentajeConfigurado = configDesc?.porcentaje || 0;

    // d) Evaluar si aplica
    const aplicaDescuento = cancelaciones < 2 && totalReprogramaciones < 2;
    const porcentajeFinal = aplicaDescuento ? porcentajeConfigurado : 0;


    // 5. Caso: El paciente ACEPTA (Ejecución en Transacción)
    return await this.prisma.$transaction(async (tx) => {
      
      const reservaIds: number[] = [];

      // A. Obtenemos los precios de los turnos para calcular el subtotal
      const turnosData = await tx.turno.findMany({
        where: { id: { in: turnoIds } },
        select: { 
          tipoActividad: { 
            select: { precio: true } 
          } 
        }
      });

      const subtotal = turnosData.reduce((acc, t) => acc + (Number(t.tipoActividad.precio) || 0), 0);
      
      // B. Aplicamos el descuento calculado previamente
      const montoTotal = subtotal - (subtotal * (Number(porcentajeFinal) / 100));

      // C. Creamos las reservas reales y capturamos sus IDs
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

      // D. Actualizamos el estado de la lista de espera
      await tx.listaEspera.updateMany({
        where: { id: { in: listaEsperaIds } },
        data: { estado: EstadoListaEspera.ASIGNADO }
      });

      // E. Incrementamos los inscriptos de los turnos correspondientes
      for (const turnoId of turnoIds) {
        await tx.turno.update({
          where: { id: turnoId },
          data: { cantidad_inscriptos: { increment: 1 } }
        });
      }

      // F. Retornamos toda la data estructurada para el frontend
      return {
        message: esperaInicial.grupo_fijo_id ? 'Bloque de turnos fijos confirmado con éxito.' : 'Turno confirmado con éxito.',
        cantidadReservas: solicitudesAProcesar.length,
        reservaIds: reservaIds, // Todos los IDs (por si armás un link de MP que englobe múltiples items)
        reservaId: reservaIds[0], // El primer ID (para mantener compatibilidad con tu código del frontend actual)
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