import { Module } from '@nestjs/common';
import { NotificacionesService } from '@/notificaciones/notificaciones.service';
import { NotificacionesController } from '@/notificaciones/notificaciones.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { MailModule } from '@/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificacionesService],
  controllers: [NotificacionesController],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
