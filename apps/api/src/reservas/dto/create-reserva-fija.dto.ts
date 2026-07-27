import { IsDateString, IsInt, IsString } from "class-validator";

export class CrearReservaFijaDto {
  @IsInt()
  actividadId!: number ;

  @IsString()

  diaSemana!: string; 

  @IsString()
  // Formato 'HH:mm' -> '17:00'
  horario!: string; 

  @IsDateString()
  fechaInicioMes!: string; // '2026-04-01'

  @IsDateString()
  fechaFinMes!: string ;    // '2026-04-30'
}