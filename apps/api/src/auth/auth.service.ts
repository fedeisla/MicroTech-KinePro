import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; 
import { PrismaService } from '../prisma/prisma.service'; 
import { LoginDto } from 'src/usuarios/usuarios.dto';
import { MailService } from '../mail/mail.service'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService 
  ) {}

  async login(dto: LoginDto) {
    const usuarioIngresado = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Escenario 2: Fallido por email inexistente
    if (!usuarioIngresado) {
      throw new BadRequestException('Datos incorrectos');
    }

    // Escenario 5: Fallido por cuenta bloqueada
    if (usuarioIngresado.bloqueado) {
      throw new BadRequestException('La cuenta se encuentra bloqueada.');
    }

    // Escenario 3 y 4: Fallido por contraseña incorrecta
    if (usuarioIngresado.contrasena !== dto.password) {
      const nuevosIntentos = usuarioIngresado.intentosFallidos + 1;
      
      await this.prisma.usuario.update({
        where: { id: usuarioIngresado.id },
        data: { intentosFallidos: nuevosIntentos },
      });

      if (nuevosIntentos === 3) {
        await this.prisma.usuario.update({
          where: { id: usuarioIngresado.id },
          data: { bloqueado: true },
        });
        
        const tokenDesbloqueo = this.jwtService.sign(
          { id: usuarioIngresado.id, accion: 'desbloquear_cuenta' },
          { expiresIn: '15m' } 
        );
        
        
        this.mailService.sendUnlockEmail(usuarioIngresado.email, tokenDesbloqueo)
          .catch(err => console.error('Error enviando email de desbloqueo:', err));
          
        throw new BadRequestException(
          'Datos incorrectos. La cuenta fue bloqueada y se le envió un email al correo asociado para desbloquearla.'
        );
      }

      throw new BadRequestException('Datos incorrectos.');
    }

    // Escenario 1: Exitoso -> Reseteamos intentos fallidos
    await this.prisma.usuario.update({
      where: { id: usuarioIngresado.id },
      data: { intentosFallidos: 0 },
    });
    
    const paciente = await this.prisma.paciente.findUnique({
      where: { usuario_id: usuarioIngresado.id },
      select: { id: true }
    });

    // Esto es para el token, es info que va con el token
    const usuarioRegistrado = { 
      id: usuarioIngresado.id,
      pacienteId: paciente ? paciente.id : null,
      dni: usuarioIngresado.dni, 
      email: usuarioIngresado.email,
      rol: usuarioIngresado.rol 
    };

    // Firmamos el token y retornamos lo que necesite el front
    return {
      message: 'Inicio de sesión exitoso',
      token: this.jwtService.sign(usuarioRegistrado),
      usuario: {
        id: usuarioIngresado.id,
        pacienteId: paciente ? paciente.id : null, 
        nombre: usuarioIngresado.nombre,
        apellido: usuarioIngresado.apellido,
        email: usuarioIngresado.email,
        dni: usuarioIngresado.dni,
        telefono: usuarioIngresado.telefono,
        rol: usuarioIngresado.rol,
      },
    };
  }

  async desbloquearCuenta(token: string) {
    try {
      //Verificamos el token. Si pasaron los 15 minutos, esto lanza un error automáticamente
      const payload = this.jwtService.verify(token);

      //Validamos que el token sea efectivamente para desbloquear 
      if (payload.accion !== 'desbloquear_cuenta') {
        throw new BadRequestException('Token inválido para esta acción.');
      }

      //Buscamos el usuario y restablecemos sus contadores
      await this.prisma.usuario.update({
        where: { id: payload.id },
        data: { 
          bloqueado: false, 
          intentosFallidos: 0 
        },
      });

      return { message: 'Cuenta desbloqueada con éxito. Ya puedes volver a iniciar sesión.' };

    } catch (error) {
      throw new BadRequestException(
        'El enlace de desbloqueo ha expirado o es inválido. Intenta iniciar sesión para generar uno nuevo.'
      );
    }
  }


}