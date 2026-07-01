import { IsNumber, Min, Max } from 'class-validator'

export class ActualizarDescuentoDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El porcentaje debe ser un número' },
  )
  @Min(0, { message: 'El porcentaje debe estar entre 0 y 100' })
  @Max(100, { message: 'El porcentaje debe estar entre 0 y 100' })
  porcentaje!: number
}