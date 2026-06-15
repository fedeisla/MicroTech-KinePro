import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/mail/mail.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);
  constructor(private prisma: PrismaService, private mailService: MailService) {}

  // Ejecutar procesamiento periódico de notificaciones pendientes
  private _started = false;
  startScheduler() {
    if (this._started) return;
    this._started = true;
    setInterval(() => {
      this.procesarPendientes().catch((e) => this.logger.error(String(e)));
    }, 1000 * 60 * 10); // cada 10 minutos
  }

  async obtenerUltimasDelPaciente(pacienteId: number, limit = 4) {
    const now = new Date();
    const notis: any[] = await (this.prisma.notificacion.findMany as any)({
      where: {
        paciente_id: pacienteId,
        estado: 'ENVIADA',
        fecha_envio: { lte: now },
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

  async crearNotificacion(datos: { pacienteId: number; reservaId?: number; titulo: string; descripcion: string; tipo: any; canal: any; fechaEnvio?: Date; enviarEmail?: boolean; email?: string }) {
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
        await this.mailService.sendNotificationEmail(datos.email, datos.titulo, datos.descripcion);
        await this.prisma.notificacion.update({
          where: { id: record.id },
          data: { estado: 'ENVIADA', fecha_envio: new Date() } as any,
        });
      } catch (err) {
        this.logger.error('Error enviando email de notificacion: ' + String(err));
        await this.prisma.notificacion.update({ where: { id: record.id }, data: { estado: 'ERROR' } });
      }
    }

    return record;
  }

  // Método simple para procesar notificaciones pendientes (envíos programados)
  async procesarPendientes() {
    const ahora = new Date();
    const pendientes: any[] = await (this.prisma.notificacion.findMany as any)({ where: { estado: 'PENDIENTE', fecha_envio: { lte: ahora } } });
    for (const n of pendientes) {
      try {
        // intentar enviar email si el canal es EMAIL
        if (n.canal === 'EMAIL') {
          const paciente = await this.prisma.paciente.findUnique({ where: { id: n.paciente_id }, include: { usuario: true } });
          if (paciente && paciente.usuario) {
            await this.mailService.sendNotificationEmail(paciente.usuario.email, n.titulo, n.descripcion);
            await this.prisma.notificacion.update({
              where: { id: n.id },
              data: { estado: 'ENVIADA', fecha_envio: new Date() } as any,
            });
          }
        }
      } catch (err) {
        this.logger.error('Error procesando notificacion: ' + String(err));
        await this.prisma.notificacion.update({ where: { id: n.id }, data: { estado: 'ERROR' } });
      }
    }
  }

  async marcarTodasComoLeidas(pacienteId: number) {
    await this.prisma.notificacion.updateMany({
      where: {
        paciente_id: pacienteId,
        estado: 'ENVIADA',
      } as any,
      data: { leida: true } as any,
    });
  }

  async cancelarNotificacionesDeReserva(reservaId: number) {
    await this.prisma.notificacion.updateMany({
      where: {
        reserva_id: reservaId,
      } as any,
      data: { estado: 'ERROR' },
    });
  }
}
