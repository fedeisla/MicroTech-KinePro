import { IsEmail, IsInt, ArrayNotEmpty, IsArray, IsDateString } from 'class-validator';

export class CreateReservaFijaPresencialDto {
  @IsEmail({}, { message: 'El email no tiene formato válido' })
  email!: string;

  @IsInt({ message: 'El id del turno inicial debe ser un número entero' })
  turnoInicialId!: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe enviar al menos una fecha' })
  @IsDateString({}, { each: true, message: 'Cada fecha debe estar en formato YYYY-MM-DD' })
  fechas!: string[];
}
