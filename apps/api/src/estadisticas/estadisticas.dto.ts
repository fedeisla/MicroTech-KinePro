import { IsDateString } from 'class-validator';

export class RangoFechasDto {
  @IsDateString({}, { message: 'La fecha inicial debe estar en formato YYYY-MM-DD' })
  desde!: string;

  @IsDateString({}, { message: 'La fecha final debe estar en formato YYYY-MM-DD' })
  hasta!: string;
}
