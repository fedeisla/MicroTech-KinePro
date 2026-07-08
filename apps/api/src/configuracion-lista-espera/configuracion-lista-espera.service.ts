// src/configuracion/configuracion.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegurate de que la ruta sea correcta
import { UpdateConfiguracionListaDto } from './update-configuracion.dto';



@Injectable()
export class ConfiguracionListaService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerConfiguracion() {
    let config = await this.prisma.configuracionSistema.findUnique({
      where: { id: 1 },
    });
    if (!config) {
      config = await this.prisma.configuracionSistema.create({
        data: {
          id: 1,
          porcentajeListaEspera: 20,
          contadorRespiracion: 0,
          horasExpiracionEspera: 12.0,
        },
      });
    }
    return config;
  }

  async actualizarConfiguracion(data: UpdateConfiguracionListaDto) {
    await this.obtenerConfiguracion();
    return this.prisma.configuracionSistema.update({
      where: { id: 1 },
      data: data,
    });
  }
}