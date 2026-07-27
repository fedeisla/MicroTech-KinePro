import { RolUsuario } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsString, IsEmail, IsDate, MinLength, IsInt, IsOptional, IsNotEmpty, IsEnum, Matches } from 'class-validator';

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$/;
const DNI_NUMERICO = /^\d{7,8}$/;
const TELEFONO_NUMERICO = /^\d{8,15}$/;

// 1. EL DTO BASE
// (Solo los campos de la tabla Usuario, tanto para Paciente como Administrador)
export class BaseUsuarioDto {
  @IsString()
  @Matches(SOLO_LETRAS, { message: 'El nombre solo puede contener letras' })
  nombre!: string;

  @IsString()
  @Matches(SOLO_LETRAS, { message: 'El apellido solo puede contener letras' })
  apellido!: string;

  @IsString()
  @Matches(DNI_NUMERICO, { message: 'El DNI debe contener solo números (7 u 8 dígitos)' })
  dni!: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  email!: string;

  @IsString()
  @Matches(TELEFONO_NUMERICO, { message: 'El teléfono solo puede contener números' })
  telefono!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe contener mínimo 8 caracteres' })
  password!: string;
}

// 2. El DTO de la HU "Registrar usuario"
export class CreatePacienteDto extends BaseUsuarioDto {
  @IsDate({ message: 'El formato de la fecha de nacimiento no es válido' })
  @Type(() => Date)
  fechaNacimiento!: Date;
}

export class CreateAdminDto extends BaseUsuarioDto {
  // Como no hereda de CreatePacienteDto no pide fecha de nacimiento.
}

export class UpdateUsuarioDto {
  @IsInt()
  id!: number;

  @IsOptional()
  @IsString()
  @Matches(SOLO_LETRAS, { message: 'El nombre solo puede contener letras' })
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(SOLO_LETRAS, { message: 'El apellido solo puede contener letras' })
  apellido?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El formato del email no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(TELEFONO_NUMERICO, { message: 'El teléfono solo puede contener números' })
  telefono?: string;

  @IsOptional()
  @IsString()
  @Matches(DNI_NUMERICO, { message: 'El DNI debe contener solo números (7 u 8 dígitos)' })
  dni?: string;

  @IsOptional()
  @IsEnum(RolUsuario, {
    message: 'El rol debe ser uno de: OWNER, ADMIN, PACIENTE',
  })
  rol?: RolUsuario;
}

export class LoginDto {
  @IsEmail({}, { message: 'El formato del email no es válido' })
  email!: string;

  @IsString()
  password!: string;
}
export class LogoutDto {
  email!: string;
}

export class UpdateContrasenaDto {
  @IsString()
  passwordActual!: string;

  @IsString()
  passwordNueva!: string;

  @IsEmail()
  email!: string;
}

 export class CallRestoreContrasenaDto {
  @IsEmail()
  email!: string;
}
export class RestoreContrasenaNuevaDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe contener mínimo 8 caracteres' })
  passwordNueva!: string;
}
export class UnlockAccountDto {
  @IsString({ message: 'El token debe ser una cadena de texto' })
  token!: string;
}

export class AsignarRolDto {
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsEnum(RolUsuario, {
    message: 'El rol debe ser uno de: OWNER, ADMIN, PACIENTE, KINESIOLOGO',
  })
  rol!: RolUsuario;
}