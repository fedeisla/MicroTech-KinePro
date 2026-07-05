import { 
  Controller, 
  Get, 
  Delete, 
  Param, 
  ParseIntPipe,
  Body,
  Post,
  Req,
  Patch,
  BadRequestException, 
  // UseGuards
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ListaEsperaService } from './lista-espera.service';
import { Public } from '@/auth/public.decorator';

@Controller('lista-espera')
export class ListaEsperaController {
  constructor(
    private readonly listaEsperaService: ListaEsperaService,
    private eventEmitter: EventEmitter2
  ) {}
  
  @Post('inscribir')
  async inscribir(@Req() req, @Body() body: { turnoId: number; prioridad: number }) {
    // Acá garantizamos que el paciente solo pueda anotarse a sí mismo usando su token
    const pacienteId = req.user.pacienteId;
    return this.listaEsperaService.inscribirPaciente(body.turnoId, pacienteId, body.prioridad);
  }
  
  // --- VIRTUAL (Paciente - usa su token) ---
 @Post('inscribir-fijo')
  async inscribirFijo(@Req() req, @Body() body: { turnoId: number, fechasString: string[] }) {
    return await this.listaEsperaService.inscribirTurnoFijoVirtual(
      req.user.pacienteId, 
      body.turnoId, 
      body.fechasString 
    );
  }


  @Delete(':id')
  async cancelar(@Param('id') id: string) {
    return this.listaEsperaService.cancelarEspera(+id);
  }

  @Patch(':id/responder')
  async responderNotificacion( @Param('id') id: string,  @Body() body: { acepta: boolean; turnoId?: number }) 
  {
    return await this.listaEsperaService.confirmarTurno(+id, body.acepta);
  }

  @Get('mi-estado')
  async obtenerMiEstado(@Req() req) {
    return this.listaEsperaService.obtenerEstadoPaciente(req.user.pacienteId);
  }



  @Get('turno/:turnoId/admin')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  async obtenerListaAdmin(@Param('turnoId', ParseIntPipe) turnoId: number) {
    return await this.listaEsperaService.obtenerListaParaAdmin(turnoId);
  }

  @Delete(':id/admin')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  async eliminarDeListaAdmin(@Param('id', ParseIntPipe) id: number) {
    // Reutilizamos el método base, pero este endpoint lo protegerás solo para admins
    return await this.listaEsperaService.cancelarEsperaAdmin(id);
  }

  @Post('admin/inscribir')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  async inscribirAdmin(@Body() body: { turnoId: number; email: string; prioridad: number }) {
    // Como el select del frontend manda el email del paciente, llamamos a un método preparado para eso
    return await this.listaEsperaService.inscribirPorEmail(body.turnoId, body.email, body.prioridad);
  }
  
  // --- PRESENCIAL (Admin - busca por email) ---
 /* @Post('admin/inscribir-fijo')
  async inscribirFijoAdmin(@Body() body: { turnoIds: number[]; email: string }) {
    // Usamos el email enviado por el admin
    return await this.listaEsperaService.inscribirTurnoFijoPresencial(body.email, body.turnoIds);
  }*/
}