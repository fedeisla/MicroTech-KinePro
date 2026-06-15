import { BadRequestException, Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, ParseIntPipe } from '@nestjs/common';

import { CreateReservaDto, MarcarAsistenciaDto } from './dto/create-reserva.dto';
import { CreateReservaPresencialDto } from './dto/create-reserva-presencial.dto';
import { CreateReservaFijaPresencialDto } from './dto/create-reserva-fija-presencial.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { ReservaService } from './reserva.service';
import { EstadoReserva } from '@prisma/client';
import { Roles } from '@/auth/roles.decorator';

@Controller('reserva')
export class ReservaController {
  constructor(private readonly reservaService: ReservaService) {}

  @Roles('PACIENTE')
  @Post('crear')
  create(@Req() req, @Body() createReservaDto: CreateReservaDto) {
    const pacienteId = req.user.pacienteId;
    return this.reservaService.create(createReservaDto, pacienteId);
  }
  @Roles('PACIENTE')
  @Post('fija')
  crearFija(@Req() req, @Body() body: {turnoInicialId:number, fechas: string[] }) {
    const pacienteId = req.user.pacienteId;
     console.log(pacienteId);
    return this.reservaService.crearReservaFija(pacienteId,body.turnoInicialId, body.fechas);
  }

  @Roles('ADMIN', 'OWNER')
  @Post('crear-presencial')
  crearPresencial(@Body() body: CreateReservaPresencialDto) {
    // El admin/owner provee el email del paciente y el id del turno
    return this.reservaService.createForEmail({ turno_id: body.turno_id }, body.email);
  }

  @Roles('ADMIN', 'OWNER')
  @Post('fija-presencial')
  crearFijaPresencial(@Body() body: CreateReservaFijaPresencialDto) {
    return this.reservaService.crearReservaFijaForEmail(body.email, body.turnoInicialId, body.fechas);
  }

  @Roles('ADMIN', 'OWNER')
  @Patch('presencial/:id')
  reprogramarPresencial(@Param('id') id: string, @Body() body: UpdateReservaDto) {
    if (typeof body.turno_id !== 'number') {
      throw new BadRequestException('Debe indicar el turno de destino');
    }
    return this.reservaService.reprogramarPresencial(+id, body.turno_id);
  }

  @Roles('ADMIN', 'OWNER')
  @Delete('presencial/:id')
  cancelarPresencial(@Param('id') id: string) {
    return this.reservaService.cancelarPresencial(+id);
  }

  @Roles('PACIENTE')
  @Get('')
  findAll(@Req() req) {
    const pacienteId = req.user.pacienteId;
    return this.reservaService.findAll(pacienteId);
  }

  @Roles('PACIENTE')
  @Get('historial')
  findHistorial(@Req() req) {
    const pacienteId = req.user.pacienteId;
    return this.reservaService.findHistorial(pacienteId);
  }

  @Roles('PACIENTE')
  @Get('mis-reservas')
  async getReservasFiltro(@Req() req, @Query('estado') estado:EstadoReserva = EstadoReserva.PENDIENTE)
  {
    const pacienteId = req.user.pacienteId;    
    return this.reservaService.filtrarReservas(pacienteId, estado);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservaService.findOne(+id);
  }

  @Roles('PACIENTE')
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateReservaDto: UpdateReservaDto) {
    const pacienteId =req.user.pacienteId;
    return this.reservaService.update(+id, pacienteId, updateReservaDto);
  }

  @Roles('PACIENTE')
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    const pacienteId = req.user.pacienteId;
    return this.reservaService.remove(+id, pacienteId);
  }

  @Roles('ADMIN', 'OWNER')
  @Get('por-turno/:turnoId')
  listarPorTurno(@Param('turnoId', ParseIntPipe) turnoId: number) {
    return this.reservaService.listarPorTurno(turnoId)
  }
  
  @Roles('ADMIN', 'OWNER')
  @Patch(':id/asistencia')
  marcarAsistencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarAsistenciaDto,
  ) {
    return this.reservaService.marcarAsistencia(id, dto.asistio)
  }
}
