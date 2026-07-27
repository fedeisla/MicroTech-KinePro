import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { CreatePacienteDto, LogoutDto, LoginDto, CallRestoreContrasenaDto, AsignarRolDto } from './usuarios.dto';
import { UpdateUsuarioDto,UpdateContrasenaDto, UnlockAccountDto, RestoreContrasenaNuevaDto } from './usuarios.dto';
import crypto from 'crypto';
import { MailService } from '@/mail/mail.service';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService, private readonly mailService: MailService,private readonly jwtService: JwtService) {}

  async registrar(dto: CreatePacienteDto) {
    // Escenario 2: Registro fallido por DNI ya registrado
    const dniExiste = await this.prisma.usuario.findUnique({
      where: { dni: dto.dni },
    });
    if (dniExiste) {
      throw new BadRequestException('El DNI ya se encuentra registrado');
    }
    // Escenario 3: Registro fallido por email ya registrado
    const emailExiste = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (emailExiste) {
      throw new BadRequestException('El email ya se encuentra registrado');
    }
    // Escenario 4: Registro fallido por teléfono ya registrado
    const telefonoExiste = await this.prisma.usuario.findUnique({
      where: { telefono: dto.telefono },
    });
    if (telefonoExiste) {
      throw new BadRequestException('El teléfono ya se encuentra registrado');
    }
    // Escenario 5: Registro fallido por edad menor a los 13 años.
    const hoy = new Date();
    const fechaNac = dto.fechaNacimiento;
    let edadExacta = hoy.getFullYear() - fechaNac.getFullYear();
    const diferenciaMeses = hoy.getMonth() - fechaNac.getMonth();

    if (diferenciaMeses < 0 || (diferenciaMeses === 0 && hoy.getDate() < fechaNac.getDate())) {
      edadExacta--;
    }
    if (edadExacta < 13) {
      throw new BadRequestException('La edad mínima para registrarse es 13 años');
    }
    // Hashear contraseña (Buenas prácticas, nunca en texto plano)
    // const salt = await bcrypt.genSalt();
    // const hashedPassword = await bcrypt.hash(dto.password, salt);
    // Escenario 1: Registro exitoso
    await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        email: dto.email,
        telefono: dto.telefono,
        contrasena: dto.password, // Reemplazar por hashedPassword
        rol: 'PACIENTE',
        paciente: {
          create: {
            fecha_nacimiento: dto.fechaNacimiento,
            tipo_plan: 'PARTICULAR',
          },
        },
      },
    });

    return { message: 'Registro exitoso' };
  }

  async modificar(dto: UpdateUsuarioDto){
    const usuarioActual = await this.prisma.usuario.findUnique({
      where: { id: dto.id },
    });

    if (!usuarioActual) {
      throw new NotFoundException(`El usuario con ID ${dto.id} no existe`);
    }

    if (dto.email && dto.email !== usuarioActual.email) {
      const emailExiste = await this.prisma.usuario.findFirst({
        where: {
          email: dto.email,
          NOT: { id: dto.id },
        },
      });
      if (emailExiste) {
        throw new BadRequestException('El email ya se encuentra registrado');
      }
    }

    if (dto.telefono && dto.telefono !== usuarioActual.telefono) {
      const telefonoExiste = await this.prisma.usuario.findFirst({
        where: {
          telefono: dto.telefono,
          NOT: { id: dto.id },
        },
      });
      if (telefonoExiste) {
        throw new BadRequestException('El teléfono ya se encuentra registrado');
      }
    }

    if (dto.dni && dto.dni !== usuarioActual.dni) {
      const dniExiste = await this.prisma.usuario.findFirst({
        where: {
          dni: dto.dni,
          NOT: { id: dto.id },
        },
      });
      if (dniExiste) {
        throw new BadRequestException('El DNI ya se encuentra registrado');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.email && dto.email !== usuarioActual.email) data.email = dto.email;
    if (dto.nombre && dto.nombre !== usuarioActual.nombre) data.nombre = dto.nombre;
    if (dto.apellido && dto.apellido !== usuarioActual.apellido) data.apellido = dto.apellido;
    if (dto.dni && dto.dni !== usuarioActual.dni) data.dni = dto.dni;
    if (dto.telefono && dto.telefono !== usuarioActual.telefono) data.telefono = dto.telefono;

    if (Object.keys(data).length === 0) {
      return { message: 'No hay cambios para aplicar' };
    }

    await this.prisma.usuario.update({
      where: { id: dto.id },
      data,
    });

    return { message: 'Modificacion de datos exitosa' };
  }

  

 
  async cerrarSesion(dto: LogoutDto) {
    const usuarioLogueado = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuarioLogueado) {
      throw new BadRequestException('Usuario no encontrado');
    }
    return { message: 'Cierre de sesión exitoso' };
  }

  async modificarContrasena (dto: UpdateContrasenaDto){ 
    const usuarioLog = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    // Esto es necesario porque sino me tira error en usuarioLog mas abajo.
    if (!usuarioLog) {
      throw new BadRequestException('Usuario no encontrado');
    }
    //Escenario 2: Fallido por contraseña actual incorrecta.
    if (usuarioLog.contrasena !== dto.passwordActual) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    //Escenaario 3: Fallido por contraseña nueva igual a la actual.
    if (usuarioLog.contrasena === dto.passwordNueva) {
      throw new BadRequestException('La contraseña nueva debe ser distinta a la actual');
    }
    //Escenario 4: Fallido por contraseña nueva menor a 8 caracteres.
    if (dto.passwordNueva.length < 8){
      throw new BadRequestException('La contraseña debe contener mínimo 8 caracteres');
    }
    await this.prisma.usuario.update({
      where: { email: dto.email },
      data: {
        contrasena: dto.passwordNueva,
      },
    }); 
    return { message: 'Modificación exitosa' };
  }

  async callRestablecerContrasena(dto: CallRestoreContrasenaDto) {
    const { email } = dto;

    // Busco al usuario en la base de datos
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    // Simplemente retornas un mensaje de éxito aunque no exista, pero solo envías el correo si existe.
    if (!usuario) {
      return { message: 'Si el correo está registrado, recibirás un enlace de recuperación.' };
    }

    //Genero un token seguro usando JWT
    // y estableces una fecha de expiración.
    const payload = { 
      sub: usuario.id, 
      email: usuario.email,
      tipo: 'restablecimiento_password' 
    };
    const token = this.jwtService.sign(payload, {
      expiresIn: '30m', 
    });
   
   await this.prisma.usuario.update({
      where: { 
        email: email 
      },
      data: {
        token: token 
      }
    });
  
    await this.mailService.sendPasswordResetEmail(email, token);

    return { message: 'Si el correo está registrado, recibirás un enlace de recuperación.' };
  }

 async restablecimientoContrasena(dto: RestoreContrasenaNuevaDto) { 
  const usuarioPorRestablecer = await this.prisma.usuario.findFirst({
    where: { token: dto.token },
  });
  if (!usuarioPorRestablecer || !dto.token) {
    throw new BadRequestException('El enlace de restablecimiento es inválido o expiró.');
  }
  // Escenario 4: Fallido por contraseñas idénticas
  if (usuarioPorRestablecer.contrasena === dto.passwordNueva) {
    throw new BadRequestException('La contraseña debe ser distinta a la actual');
  }
  // Escenario 5: Fallido por contraseña nueva menor a 8 caracteres
  if (dto.passwordNueva.length < 8) {
    throw new BadRequestException('La contraseña debe contener mínimo 8 caracteres');
  }
  // Escenario 3: Restablecimiento exitoso
  await this.prisma.usuario.update({
    where: { id: usuarioPorRestablecer.id },
    data: {
      contrasena: dto.passwordNueva,
      token: null,
    },
  });
  return { message: 'Restablecimiento exitoso' }; 
}

  async obtenerTodos() {
    const usuarios = await this.prisma.usuario.findMany({
      // Utilizo select para NO enviar la contraseña al frontend
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        dni: true,
        telefono: true,
        rol: true,
        fecha_registro: true,
      },
    });

    if (usuarios.length === 0) {
      return { message: 'No existen usuarios', data: [] };
    }
    // Escenario 1
    return { data: usuarios };
  }

  async obtenerPorId(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        dni: true,
        telefono: true,
        rol: true,
        fecha_registro: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`El usuario con ID ${id} no existe`);
    }

    return { data: usuario };
  }

  async asignarRol(id: number, dto: AsignarRolDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { rol: dto.rol },
    });

    return { message: `Rol "${dto.rol}" asignado correctamente a ${usuario.email}` };
  }

  async eliminarUsuario(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        paciente: {
          include: {
            reservas: {
              where: {
                estado: {
                  in: ['PENDIENTE', 'CONFIRMADA'],
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe');
    }

    // Verificar si es paciente y tiene turnos activos
    if (usuario.paciente && usuario.paciente.reservas.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar el usuario porque tiene turnos activos',
      );
    }

    // Eliminar datos relacionados según el rol
    if (usuario.paciente) {
      // Eliminar registros relacionados al paciente
      await this.prisma.descuento.deleteMany({
        where: { paciente_id: usuario.paciente.id },
      });
      await this.prisma.notificacion.deleteMany({
        where: { paciente_id: usuario.paciente.id },
      });
      await this.prisma.listaEspera.deleteMany({
        where: { paciente_id: usuario.paciente.id },
      });
      // Eliminar el registro de paciente
      await this.prisma.paciente.delete({
        where: { id: usuario.paciente.id },
      });
    }

    if (usuario.rol === 'KINESIOLOGO') {
      // Eliminar el registro de kinesiólogo si existe
      const kinesiologo = await this.prisma.kinesiologo.findUnique({
        where: { usuario_id: id },
      });
      if (kinesiologo) {
        await this.prisma.kinesiologo.delete({
          where: { id: kinesiologo.id },
        });
      }
    }

    // Eliminar el usuario
    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'El usuario se eliminó con éxito' };
  }

}
