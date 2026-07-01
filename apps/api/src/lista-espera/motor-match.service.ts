import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoListaEspera } from '@prisma/client';
import { NotificacionesService } from '@/notificaciones/notificaciones.service';
import { TipoNotificacion } from '@prisma/client';

@Injectable()
export class MotorMatchService {
 private readonly logger = new Logger(MotorMatchService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private notificacionesService: NotificacionesService
  ) {}

  @OnEvent('turno.liberado')
  async manejarTurnoLiberado(payload: { turnoId: number }) {
    this.logger.log(`Procesando match para el turno ID ${payload.turnoId}`);

    const config = await this.prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    if (!config) {
      this.logger.warn(`🛑 ERROR: No existe ConfiguracionSistema.`);
      return;
    }

    // Política de inanición: Si tocaRespiracion es true, buscamos Prioridad 2 (Demanda)
    const tocaRespiracion = config.contadorRespiracion >= 4;
    let candidato = await this.buscarSiguiente(payload.turnoId, tocaRespiracion ? 2 : 1);

    // Fallback: Si no hay de la prioridad buscada, intentamos con la otra
    if (!candidato) {
      candidato = await this.buscarSiguiente(payload.turnoId, tocaRespiracion ? 1 : 2);
    }

    if (!candidato) {
      this.logger.warn(`No se encontró candidato para turno ${payload.turnoId}`);
      return;
    }

    // --- LÓGICA DE ASIGNACIÓN ---
    if (candidato.grupo_fijo_id) {
      await this.procesarAsignacionBloque(candidato.grupo_fijo_id, config);
    } else {
      await this.procesarAsignacionIndividual(candidato, config);
    }
  }

  // Lógica para asignar un BLOQUE (Turno Fijo)
  private async procesarAsignacionBloque(grupoId: string, config: any) {
    const bloque = await this.prisma.listaEspera.findMany({ 
      where: { grupo_fijo_id: grupoId, estado: EstadoListaEspera.PENDIENTE },
      include: { turno: true } 
    });

    // Validamos que TODOS los turnos del bloque sigan teniendo cupo disponible
    const todosDisponibles = bloque.every(item => item.turno.cantidad_inscriptos < item.turno.capacidad);

    if (todosDisponibles) {
      await this.prisma.$transaction(async (tx) => {
        // Notificamos a todos los del bloque
        await tx.listaEspera.updateMany({
          where: { grupo_fijo_id: grupoId },
          data: { estado: EstadoListaEspera.NOTIFICADO, fecha_notificacion: new Date() }
        });

        // Incrementamos contador de inanición (1 bloque = 1 unidad de progreso)
        await tx.configuracionSistema.update({
          where: { id: 1 },
          data: { contadorRespiracion: { increment: 1 } }
        });
      });
      this.logger.log(`Bloque fijo ${grupoId} asignado correctamente.`);
    } else {
      this.logger.warn(`Bloque ${grupoId} no asignado: algunos turnos se llenaron.`);
    }
  }

  // Lógica para asignar un INDIVIDUAL (Demanda)
  private async procesarAsignacionIndividual(candidato: any, config: any) {
    await this.prisma.$transaction(async (tx) => {
      await tx.listaEspera.update({
        where: { id: candidato.id },
        data: { estado: EstadoListaEspera.NOTIFICADO, fecha_notificacion: new Date() }
      });

      // Resetear contador si asignamos un "turno por demanda" (según tu lógica de respiración)
      // O incrementar según política. Aquí reseteamos a 0 si es prioridad 2 (Demanda)
      const nuevoContador = candidato.prioridad === 2 ? 0 : config.contadorRespiracion;
      await tx.configuracionSistema.update({
        where: { id: 1 },
        data: { contadorRespiracion: nuevoContador }
      });
    });
    this.logger.log(`Turno individual asignado a paciente ${candidato.paciente_id}.`);
  }

  private async buscarSiguiente(turnoId: number, prioridad: number) {
    return await this.prisma.listaEspera.findFirst({
      where: { turno_id: turnoId, prioridad, estado: EstadoListaEspera.PENDIENTE },
      orderBy: { fecha_anotacion: 'asc' }
    });
  }

  // para test CronExpression.EVERY_10_SECONDS
  @Cron(CronExpression.EVERY_10_SECONDS) // en produccion CronExpression.EVERY_5_MINUTES
  async limpiarExpirados() {
    const config = await this.prisma.configuracionSistema.findUnique({ where: { id: 1 } });
    const horasLimite = config ? config.horasExpiracionEspera : 12;
    const haceXHoras = new Date(Date.now() - horasLimite * 60 * 60 * 1000);

    // 1. Traemos los expirados incluyendo al paciente, usuario (email) y datos del turno
    const expirados = await this.prisma.listaEspera.findMany({
      where: {
        estado: EstadoListaEspera.NOTIFICADO,
        fecha_notificacion: { lt: haceXHoras }
      },
      include: {
        paciente: {
          include: { usuario: true }
        },
        turno: {
          include: { tipoActividad: true }
        }
      }
    });

    for (const expirado of expirados) {
      // 2. Actualizamos el estado a EXPIRADO
      await this.prisma.listaEspera.update({
        where: { id: expirado.id },
        data: { estado: EstadoListaEspera.EXPIRADO }
      });

      this.logger.log(`Paciente ID ${expirado.paciente_id} expirado por superar las ${horasLimite}hs de espera. Re-emitiendo turno.`);

      // 3. Flujo de Notificación por Email (Protegido con try/catch para que no trabe el motor)
      try {
        if (expirado.paciente?.usuario?.email) {
          const turno = expirado.turno;
          
        
          const fechaTurno = new Date(Date.UTC(turno.fecha.getUTCFullYear(), turno.fecha.getUTCMonth(), turno.fecha.getUTCDate(), turno.hora_inicio.getUTCHours(), turno.hora_inicio.getUTCMinutes()));
          const fechaStr = fechaTurno.toLocaleDateString('es-AR');
          const horaStr = turno.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turno.hora_inicio.getUTCMinutes().toString().padStart(2, '0');

          const titulo = `Cupo de lista de espera expirado`;
          const descripcion = `Se ha excedido el tiempo límite de ${horasLimite} horas para confirmar su turno de ${turno.tipoActividad.nombre} el día ${fechaStr} a las ${horaStr}hs. El turno ha sido rechazado automáticamente.`;

          await this.notificacionesService.crearNotificacion({
            pacienteId: expirado.paciente_id,
            titulo,
            descripcion,
            tipo: TipoNotificacion.CANCELACION_TURNO, // Usá acá el tipo de Enum que corresponda en tu sistema
            canal: 'EMAIL',
            enviarEmail: true,
            email: "Federicoisla1@gmail.com",
          });
          
          this.logger.log(`Email de expiración enviado correctamente al paciente ID ${expirado.paciente_id}`);
        }
      } catch (emailError) {
        this.logger.error(`Error al enviar notificación de expiración al paciente ${expirado.paciente_id}: ${String(emailError)}`);
      }

      // 4. Volvemos a disparar el motor para el siguiente en la fila
      this.eventEmitter.emit('turno.liberado', { turnoId: expirado.turno_id });
    }
  }
}