import { Module } from '@nestjs/common'
import { PagosController } from './pagos.controller'
import { PagosService } from './pagos.service'
import { NotificacionesModule } from '@/notificaciones/notificaciones.module'
import { ConfiguracionModule } from '@/configuracion/configuracion.module'
import { NotificacionesModule } from '@/notificaciones/notificaciones.module'

@Module({
  imports: [NotificacionesModule, ConfiguracionModule],
  imports: [NotificacionesModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}