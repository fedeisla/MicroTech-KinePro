import { Controller, Post, Body, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto, ListarTurnosDto } from './turnos.dto';
import { Roles } from '@/auth/roles.decorator';
import { Public } from '@/auth/public.decorator';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Roles('OWNER', 'ADMIN')
  @Post()
  crear(@Body() createTurnoDto: CreateTurnoDto) {
    return this.turnosService.crear(createTurnoDto);
  }

   
  // HU "Visualizar turnos (personal)" - Escenarios 1 y 2
  @Public()
  @Get()
  listarPorFecha(@Query() query: ListarTurnosDto) {
    return this.turnosService.listarPorFecha(query.fecha);
  }
  
  // HU "Visualizar turnos (personal)" - Escenario 3
  @Public()
  @Get(':id')
  obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.obtenerDetalle(id);
  }
  @Public()
  @Get('dias-disponibles/:mes/:anio')
  obtenerDiasDisponibles( @Param('mes', ParseIntPipe) mes: number, @Param('anio', ParseIntPipe) anio: number )
  {
    return this.turnosService.obtenerDiasDeTurnosDisponilbles(mes, anio);
  }

  @Roles('OWNER', 'ADMIN')
  @Get('reservas-mes/:mes/:anio')
  obtenerReservasMes(
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
  ) {
    return this.turnosService.obtenerResumenReservasMes(mes, anio);
  }
   
}