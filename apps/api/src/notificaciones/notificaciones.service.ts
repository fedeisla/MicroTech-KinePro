import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';
import { fechaEnvioRecordatorio24h } from '@/common/datetime.util';

@Injectable()
export class NotificacionesService implements OnModuleInit {
  private readonly logger = new Logger(NotificacionesService.name);
  constructor(private prisma: PrismaService, private mailService: MailService) {}

  async onModuleInit() {
    await this.recalcularFechasRecordatoriosPendientes();
    // No esperar al primer tick del cron: procesar lo ya vencido al levantar la API
    this.procesarPendientes().catch((e) => this.logger.error(String(e)));
  }

  /** Cada 1 minuto: envía recordatorios cuya fecha_envio ya llegó. */
  @Cron('0 * * * * *')
  async cronProcesarPendientes() {
    await this.procesarPendientes();
  }

  /**
   * Corrige fecha_envio de RECORDATORIO PENDIENTE creados con el bug de TZ
   * (hora de pared guardada como UTC sin offset de Buenos Aires).
   */
  private async recalcularFechasRecordatoriosPendientes() {
    const pendientes = await this.prisma.notificacion.findMany({
      where: { tipo: 'RECORDATORIO', estado: 'PENDIENTE' },
      include: {
        reserva: {
          include: { turno: true },
        },
      },
    });

    for (const n of pendientes) {
      const turno = n.reserva?.turno;
      if (!turno) continue;
      const correcta = fechaEnvioRecordatorio24h(turno.fecha, turno.hora_inicio);
      if (Math.abs(correcta.getTime() - n.fecha_envio.getTime()) < 1000) continue;
      await this.prisma.notificacion.update({
        where: { id: n.id },
        data: { fecha_envio: correcta },
      });
      this.logger.log(
        `Recordatorio #${n.id}: fecha_envio ${n.fecha_envio.toISOString()} → ${correcta.toISOString()}`,
      );
    }
  }

  async obtenerUltimasDelPaciente(pacienteId: number, limit = 5) {
    const now = new Date();
    const notis: any[] = await (this.prisma.notificacion.findMany as any)({
      where: {
        paciente_id: pacienteId,
        fecha_envio: { lte: now },
        estado: { in: ['ENVIADA', 'PENDIENTE'] },
      },
      orderBy: [
        { fecha_envio: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
    });
    return notis.map((n: any) => ({
      id: n.id,
      titulo: n.titulo,
      descripcion: n.descripcion,
      tiempo: n.fecha_envio.toISOString(),
      leida: n.leida,
      tipo: n.tipo,
    }));
  }

  async crearNotificacion(datos: {
    pacienteId: number;
    reservaId?: number;
    titulo: string;
    descripcion: string;
    tipo: any;
    canal: any;
    fechaEnvio?: Date;
    enviarEmail?: boolean;
    email?: string;
    html?: string;
  }) {
    const now = new Date();
    const fechaEnvio = datos.fechaEnvio ?? now;
    const record = await this.prisma.notificacion.create({
      data: {
        paciente_id: datos.pacienteId,
        reserva_id: datos.reservaId ?? undefined,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tipo: datos.tipo,
        canal: datos.canal,
        fecha_envio: fechaEnvio,
        estado: 'PENDIENTE',
      } as any,
    });

    if (datos.enviarEmail && datos.email) {
      try {
        await this.mailService.sendNotificationEmail(
          datos.email,
          datos.titulo,
          datos.descripcion,
          datos.html,
        );
        await this.prisma.notificacion.update({
          where: { id: record.id },
          data: { estado: 'ENVIADA', fecha_envio: new Date(), leida: false } as any,
        });
      } catch (err) {
        // Dejar PENDIENTE para que el cron reintente (fallos SMTP intermitentes)
        this.logger.error('Error enviando email de notificacion: ' + String(err));
      }
    }

    return record;
  }

  async procesarPendientes() {
    const ahora = new Date();
    const pendientes: any[] = await (this.prisma.notificacion.findMany as any)({
      where: { estado: 'PENDIENTE', fecha_envio: { lte: ahora } },
    });
    for (const n of pendientes) {
      try {
        if (n.canal === 'EMAIL') {
          const paciente = await this.prisma.paciente.findUnique({
            where: { id: n.paciente_id },
            include: { usuario: true },
          });
          if (paciente?.usuario?.email) {
            await this.mailService.sendNotificationEmail(
              paciente.usuario.email,
              n.titulo,
              n.descripcion,
            );
            // Forzar no leída al momento del envío real: "marcar todas" pudo
            // haberla marcado antes estando aún programada a futuro.
            await this.prisma.notificacion.update({
              where: { id: n.id },
              data: { estado: 'ENVIADA', leida: false } as any,
            });
            this.logger.log(`Notificación #${n.id} enviada a ${paciente.usuario.email}`);
          } else {
            this.logger.warn(
              `Notificación #${n.id}: paciente sin email, se deja PENDIENTE`,
            );
          }
        }
      } catch (err) {
        // No marcar ERROR: reintentar en el próximo ciclo del cron
        this.logger.error(`Error procesando notificacion #${n.id}: ` + String(err));
      }
    }
  }

  async marcarTodasComoLeidas(pacienteId: number) {
    const now = new Date();
    // Solo las ya visibles; no tocar recordatorios futuros aún no enviados
    await this.prisma.notificacion.updateMany({
      where: {
        paciente_id: pacienteId,
        fecha_envio: { lte: now },
      } as any,
      data: { leida: true } as any,
    });
  }

  async cancelarNotificacionesDeReserva(reservaId: number) {
    await this.prisma.notificacion.updateMany({
      where: {
        reserva_id: reservaId,
        estado: 'PENDIENTE',
      } as any,
      data: { estado: 'ERROR' },
    });
  }
}
