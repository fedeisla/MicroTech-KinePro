import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateConfiguracionListaDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  porcentajeListaEspera?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  horasExpiracionEspera?: number;
}