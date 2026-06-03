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
        const payloadDesbloqueo = {
          id: usuarioIngresado.id,
          email: usuarioIngresado.email,
          tipo: 'desbloquear_cuenta',
        };
        const tokenDesbloqueo = this.jwtService.sign(payloadDesbloqueo, {
          expiresIn: '15m',
        });

        await this.prisma.usuario.update({
          where: { id: usuarioIngresado.id },
          data: { bloqueado: true, token: tokenDesbloqueo },
        });

        this.mailService
          .sendUnlockEmail(usuarioIngresado.email, tokenDesbloqueo)
          .catch((err) =>
            console.error('Error enviando email de desbloqueo:', err),
          );
          
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
      const payload = this.jwtService.verify(token);
      const esTokenDesbloqueo =
        payload.tipo === 'desbloquear_cuenta' ||
        payload.accion === 'desbloquear_cuenta';
      if (!esTokenDesbloqueo) {
        throw new BadRequestException('Token inválido para esta acción.');
      }
      await this.prisma.usuario.update({
        where: { id: payload.id }, 
        data: { 
          bloqueado: false, 
          intentosFallidos: 0,
          token: null
        },
      });

      return { message: 'Cuenta desbloqueada con éxito. Ya puedes volver a iniciar sesión.' };

    } catch (error) {
     
      throw new BadRequestException(
        'El enlace de restablecimiento es inválido o expiró.'
      );
    }
}

  async solicitarDesbloqueo(email: string) {
    //Buscamos al usuario en la base de datos
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

  
  
    const mensajeExito = { 
      message: 'Si el correo está registrado y la cuenta está bloqueada, recibirás un enlace de recuperación.' 
    };

    if (!usuario) {
      return mensajeExito;
    }

    // 3. Verificamos si la cuenta realmente está bloqueada
    if (!usuario.bloqueado) {
      return { message: 'Esta cuenta no se encuentra bloqueada actualmente.' };
    }

    const payload = { 
      id: usuario.id, 
      email: usuario.email, 
      tipo: 'desbloquear_cuenta' 
    };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { token: token }, 
    });

    
    await this.mailService.sendSolicitudDesbloqueoEmail(usuario.email, token);

    return mensajeExito;
  } 



}