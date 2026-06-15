import { Module } from '@nestjs/common';
import { ReservaController } from './reserva.controller';
import { ReservaService } from './reserva.service';
import { NotificacionesModule } from '@/notificaciones/notificaciones.module';
import { MailModule } from '@/mail/mail.module';


@Module({
  imports: [NotificacionesModule, MailModule],
  controllers: [ReservaController],
  providers: [ReservaService],
  exports: [ReservaService]
})
export class ReservaModule {}
