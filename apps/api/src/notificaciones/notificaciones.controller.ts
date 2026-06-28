import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { NotificacionesService } from '@/notificaciones/notificaciones.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private notificacionesService: NotificacionesService) {}

  @Get()
  async obtenerUltimas(@Req() req: any) {
    const user = req.user;
    if (!user) return [];
    if (user.rol !== 'PACIENTE') return [];
    const pacienteId = user.pacienteId;
    return this.notificacionesService.obtenerUltimasDelPaciente(pacienteId, 5);
  }

  @Patch('marcar-leidas')
  async marcarTodas(@Req() req: any) {
    const user = req.user;
    if (!user) return { message: 'Usuario no autorizado' };
    if (user.rol !== 'PACIENTE') return { message: 'Usuario no autorizado' };
    await this.notificacionesService.marcarTodasComoLeidas(user.pacienteId);
    return { message: 'Notificaciones marcadas como leídas' };
  }
}
