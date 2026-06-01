import { Controller, Post, Body, Get, BadRequestException, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/usuarios/usuarios.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @Public()
  @Get('desbloquear')
  async desbloquear(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('El token es requerido para desbloquear la cuenta.');
    }
    return await this.authService.desbloquearCuenta(token);
  }

  @Public()
  @Post('solicitar-desbloqueo')
  async solicitarDesbloqueo(@Body() body: { email: string;}) 
  {
    return await this.authService.solicitarDesbloqueo(body.email);
  }

}