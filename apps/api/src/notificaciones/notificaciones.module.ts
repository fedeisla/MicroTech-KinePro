import { Module, OnModuleInit, Injectable } from '@nestjs/common';
import { NotificacionesService } from '@/notificaciones/notificaciones.service';
import { NotificacionesController } from '@/notificaciones/notificaciones.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { MailModule } from '@/mail/mail.module';

@Injectable()
class NotificacionesScheduler implements OnModuleInit {
  constructor(private noti: NotificacionesService) {}
  onModuleInit() {
    this.noti.startScheduler();
  }
}

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificacionesService, NotificacionesScheduler],
  controllers: [NotificacionesController],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
