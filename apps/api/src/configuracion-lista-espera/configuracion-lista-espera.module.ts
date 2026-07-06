
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module'; 
import { ConfiguracionListaService } from './configuracion-lista-espera.service';
import { ConfiguracionListaController } from './configuracion-lista-espera.controller';


@Module({
  imports: [PrismaModule],
  controllers: [ConfiguracionListaController],
  providers: [ConfiguracionListaService],
  exports: [ConfiguracionListaModule], 
})
export class ConfiguracionListaModule {}