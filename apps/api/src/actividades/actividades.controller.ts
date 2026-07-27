import { Controller, Post, Body, Patch, Param, ParseIntPipe, Delete, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto, ModificarActividadDto } from './actividades.dto';
import { Roles } from '@/auth/roles.decorator';
import { Public } from '@/auth/public.decorator';

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  crear(@Body() createActividadDto: CreateActividadDto) {
    return this.actividadesService.crear(createActividadDto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  modificar(
    @Param('id', ParseIntPipe) id: number,
    @Body() modificarActividadDto: ModificarActividadDto,
  ) {
    return this.actividadesService.modificar(id, modificarActividadDto);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK) // Por defecto DELETE devuelve 204 No Content. Lo cambiamos a 200 para poder devolver el message de la HU.
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesService.eliminar(id);
  }
  @Public()
  @Get()
  listar() {
    return this.actividadesService.listarTodas();
  }
}