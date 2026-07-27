
import { IsEnum, IsOptional } from 'class-validator';
import { CreateReservaDto } from './create-reserva.dto';
import { EstadoReserva } from '@prisma/client';

export class UpdateReservaDto extends CreateReservaDto 
{
  @IsEnum(EstadoReserva, { message: 'El estado debe ser un valor válido' })
  @IsOptional()
  estado?: EstadoReserva;
}
