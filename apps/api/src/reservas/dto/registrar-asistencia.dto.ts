import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoReserva } from '@prisma/client';

export class RegistrarAsistenciaDto {
  @IsEnum(EstadoReserva, { message: 'El estado debe ser ASISTIO o AUSENTE' })
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  estado!: EstadoReserva;
}
