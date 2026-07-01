import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common'


const PORCENTAJE_DEFAULT = 20

@Injectable()
export class ConfiguracionService {
  constructor(private prisma: PrismaService) {}

  // Devuelve el porcentaje vigente.
  // Si no existe ningún registro todavía, crea uno con 20% (default).
  async obtenerDescuento(): Promise<{ porcentaje: number; actualizado_en: Date }> {
    const config = await this.prisma.configuracionDescuento.findFirst({
      orderBy: { id: 'asc' },
    })

    if (config) {
      return {
        porcentaje: Number(config.porcentaje),
        actualizado_en: config.actualizado_en,
      }
    }

    const nuevo = await this.prisma.configuracionDescuento.create({
      data: { porcentaje: PORCENTAJE_DEFAULT },
    })
    return {
      porcentaje: Number(nuevo.porcentaje),
      actualizado_en: nuevo.actualizado_en,
    }
  }

  // Actualiza el porcentaje. La validación 0-100 la hace el DTO.
  async actualizarDescuento(porcentaje: number): Promise<{ porcentaje: number; message: string }> {
    const existente = await this.prisma.configuracionDescuento.findFirst({
      orderBy: { id: 'asc' },
    })

    const config = existente
      ? await this.prisma.configuracionDescuento.update({
          where: { id: existente.id },
          data: { porcentaje },
        })
      : await this.prisma.configuracionDescuento.create({
          data: { porcentaje },
        })

    return {
      porcentaje: Number(config.porcentaje),
      message: 'Configuración actualizada correctamente',
    }
  }
}