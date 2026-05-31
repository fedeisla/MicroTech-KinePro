import { Controller, Post, Put, Body, Get, Param, ParseIntPipe, Patch, Delete } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { AsignarRolDto, CreatePacienteDto, LoginDto, LogoutDto } from './usuarios.dto';
import { UpdateContrasenaDto, UpdateUsuarioDto } from './usuarios.dto';
import { RestoreContrasenaNuevaDto, CallRestoreContrasenaDto, UnlockAccountDto } from './usuarios.dto';
import { Public } from '@/auth/public.decorator';
import { Roles } from '@/auth/roles.decorator';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Public() // Permite el acceso sin autenticación a esta ruta
  @Post('registro')
  registrar(@Body() createPacienteDto: CreatePacienteDto) {
    return this.usuariosService.registrar(createPacienteDto);
  }
  
  @Put('modificacion')
  modificar(@Body() UpdateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.modificar(UpdateUsuarioDto);
  }

  @Post('cierre')
  cerrar(@Body() LogoutDto: LogoutDto){
    return this.usuariosService.cerrarSesion(LogoutDto);
  }

  @Put('modificarcontrasena')
  modificarContrasena(@Body() UpdateContrasenaDto: UpdateContrasenaDto){
    return this.usuariosService.modificarContrasena(UpdateContrasenaDto);
  }

  @Public() // Permite el acceso sin autenticación a esta ruta
  @Put('llamadarestablecimiento')
  restablecerContrasena(@Body() callRestoreContrasenaDto: CallRestoreContrasenaDto){
    return this.usuariosService.callRestablecerContrasena(callRestoreContrasenaDto);
  }

  @Public() // Permite el acceso sin autenticación a esta ruta
  @Put('restablecimiento')
  restablecimiento(@Body() restoreContrasenaNuevaDto: RestoreContrasenaNuevaDto){
    // ◄--- CORRECCIÓN 2: Quitamos el segundo parámetro duplicado (.email) 
    // y llamamos al nombre correcto del método del servicio:
    return this.usuariosService.restablecimientoContrasena(restoreContrasenaNuevaDto);
  } 


  @Roles('OWNER', 'ADMIN')
  @Get()
  obtenerTodos() {
    return this.usuariosService.obtenerTodos();
  }
  @Roles('OWNER', 'ADMIN')
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Roles('OWNER')
  @Patch(':id/rol')
  asignarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarRolDto,
  ) {
    return this.usuariosService.asignarRol(id, dto);
  }

  @Roles('OWNER', 'ADMIN')
  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminarUsuario(id);
  }
}