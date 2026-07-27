
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ConfiguracionListaService } from './configuracion-lista-espera.service';
import { UpdateConfiguracionListaDto } from './update-configuracion.dto';



@Controller('configuracion')
export class ConfiguracionListaController {
  constructor(private readonly configuracionService: ConfiguracionListaService) {}

  @Get()
  obtener() {
    return this.configuracionService.obtenerConfiguracion();
  }

  @Patch()
  // Acá deberías poner tu Guard para asegurarte de que solo un ADMIN pueda hacer esto
  // @UseGuards(JwtAuthGuard, RolesGuard) 
  actualizar(@Body() updateConfiguracionDto: UpdateConfiguracionListaDto) {
    return this.configuracionService.actualizarConfiguracion(updateConfiguracionDto);
  }
}