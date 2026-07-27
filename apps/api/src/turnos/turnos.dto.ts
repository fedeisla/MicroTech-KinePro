import { IsInt, IsDateString, IsString, Matches, Min, IsDefined } from 'class-validator';

export class CreateTurnoDto {
  @IsDefined({ message: 'La actividad es obligatoria' })
  @IsInt({ message: 'La actividad debe ser válida' })
  tipoActividad_id!: number;

  @IsDefined({ message: 'La fecha es obligatoria' })
  @IsDateString({}, { message: 'La fecha debe estar en formato YYYY-MM-DD' })
  fecha!: string;

  @IsDefined({ message: 'El horario es obligatorio' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'La hora debe estar en formato HH:MM (ej: "10:00")',
  })
  hora_inicio!: string;

  @IsDefined({ message: 'La capacidad es obligatoria' })
  @IsInt({ message: 'La capacidad debe ser un número entero' })
  @Min(1, { message: 'La capacidad debe ser mayor a 0' })
  capacidad!: number;
}

export class ListarTurnosDto {
  @IsDateString({}, { message: 'La fecha debe estar en formato YYYY-MM-DD' })
  fecha!: string;
}