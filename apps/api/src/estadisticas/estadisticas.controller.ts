import { Controller, Get, Query } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service';
import { RangoFechasDto } from './estadisticas.dto';
import { Roles } from '@/auth/roles.decorator';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Roles('OWNER')
  @Get()
  obtener(@Query() query: RangoFechasDto) {
    return this.estadisticasService.obtenerTodas(query.desde, query.hasta);
  }
}
