import { Controller, Get, Put, Body } from '@nestjs/common'
import { ConfiguracionService } from './configuracion.service'
import { ActualizarDescuentoDto } from './configuracion.dto'
import { Roles } from '@/auth/roles.decorator'

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Roles('OWNER', 'ADMIN', 'PACIENTE')
  @Get('descuento')
  obtener() {
    return this.service.obtenerDescuento()
  }

  @Roles('OWNER')
  @Put('descuento')
  actualizar(@Body() dto: ActualizarDescuentoDto) {
    return this.service.actualizarDescuento(dto.porcentaje)
  }
}