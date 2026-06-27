import { Controller, Post, Body, Delete, Param, Patch, Req, Get } from '@nestjs/common';
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
  async inscribir(@Req() req, @Body() body: { turnoId: number; pacienteId: number; prioridad: number }) {
    const pacienteId = req.user.pacienteId;
    return this.listaEsperaService.inscribirPaciente(body.turnoId,pacienteId, body.prioridad);
  }

  @Delete(':id')
  async cancelar(@Param('id') id: string) {
    return this.listaEsperaService.cancelarEspera(+id);
  }

  @Patch(':id/responder')
  async responderNotificacion(@Param('id') id: string, @Body() body: { acepta: boolean; turnoId: number }) {
    const resultado = await this.listaEsperaService.confirmarTurno(+id, body.acepta);
    
    // Si el paciente rechazó, avisamos al motor asincrónico para que busque a otro
    if (!body.acepta) {
      this.eventEmitter.emit('turno.liberado', { turnoId: body.turnoId });
    }
    
    return resultado;
  }
  @Get('mi-estado')
  async obtenerMiEstado(@Req() req) {
    // Asumiendo que obtienes el pacienteId del token
    return this.listaEsperaService.obtenerEstadoPaciente(req.user.pacienteId);
  }
}