import { Module } from '@nestjs/common'
import { ConfiguracionService } from './configuracion.service'
import { ConfiguracionController } from './configuracion.controller'
import { PrismaModule } from '@/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [ConfiguracionService],
  controllers: [ConfiguracionController],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}