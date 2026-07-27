import { IsEmail, IsInt, IsNotEmpty } from 'class-validator';

export class CreateReservaPresencialDto {
  @IsEmail({}, { message: 'El email no tiene formato válido' })
  email!: string;

  @IsInt({ message: 'El id del turno debe ser un número entero' })
  @IsNotEmpty({ message: 'El id del turno es obligatorio' })
  turno_id!: number;
}
