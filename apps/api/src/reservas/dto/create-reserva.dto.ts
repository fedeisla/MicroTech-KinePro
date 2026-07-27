import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';


export class CreateReservaDto {
  @IsInt({ message: 'El id del turno debe ser un número entero' })
  @IsNotEmpty({ message: 'El id del turno es obligatorio' })
  turno_id!: number;

}
