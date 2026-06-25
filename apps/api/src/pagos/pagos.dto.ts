
import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator'

export class CrearPagoDto {
  @IsInt()
  reserva_id!: number

  @IsEnum(['EFECTIVO', 'TARJETA'], {
    message: 'Debe seleccionar un método de pago para continuar',
  })
  metodo!: 'EFECTIVO' | 'TARJETA'

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número con hasta 2 decimales' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  monto?: number
}