// src/configuracion/configuracion.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegurate de que la ruta sea correcta
import { UpdateConfiguracionListaDto } from './update-configuracion.dto';



@Injectable()
export class ConfiguracionListaService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerConfiguracion() {
    // Buscamos la configuración global (siempre el id 1)
    let config = await this.prisma.configuracionSistema.findUnique({
      where: { id: 1 },
    });

    // Si la base de datos es nueva y no existe, la creamos al vuelo
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
    // Nos aseguramos de que exista el registro primero
    await this.obtenerConfiguracion();

    // Actualizamos el registro 1
    return this.prisma.configuracionSistema.update({
      where: { id: 1 },
      data: data,
    });
  }
}