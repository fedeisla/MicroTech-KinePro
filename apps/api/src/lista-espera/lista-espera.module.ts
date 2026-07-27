import { Module } from '@nestjs/common';
import { ListaEsperaController } from './lista-espera.controller';
import { ListaEsperaService } from './lista-espera.service';
import { MotorMatchService } from './motor-match.service';
import { NotificacionesModule } from '@/notificaciones/notificaciones.module';

@Module({
  controllers: [ListaEsperaController],
  imports:[NotificacionesModule],
  providers: [ListaEsperaService, MotorMatchService]
})
export class ListaEsperaModule {}
