import { Controller, Post, Body, Param, ParseIntPipe } from '@nestjs/common'
import { PagosService } from './pagos.service'
import { CrearPagoDto } from './pagos.dto'
import { Roles } from '@/auth/roles.decorator'

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Roles('OWNER', 'ADMIN')
  @Post()
  registrar(@Body() dto: CrearPagoDto) {
    return this.pagosService.registrar(dto)
  }

  
  @Roles('PACIENTE')
  @Post('mercadopago/preference/:reservaId')
  crearPreferenceMP(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.pagosService.crearPreferenceMP(reservaId)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/confirmar/:paymentId')
  confirmarPagoMP(@Param('paymentId') paymentId: string) {
    return this.pagosService.confirmarPagoMP(paymentId)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/cancelar/:reservaId')
  cancelar(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.pagosService.cancelarReservaPorPagoCancelado(reservaId)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/verificar/:reservaId')
  verificarPagoMP(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.pagosService.verificarPagoMP(reservaId)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/preference-fijo')
  crearPreferenceMPFijo(@Body() body: { reservaIds: number[] }) {
    return this.pagosService.crearPreferenceMPFijo(body.reservaIds)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/verificar-fijo/:grupoId')
  verificarPagoMPFijo(@Param('grupoId', ParseIntPipe) grupoId: number) {
    return this.pagosService.verificarPagoMPFijo(grupoId)
  }

  @Roles('PACIENTE')
  @Post('mercadopago/cancelar-fijo')
  cancelarPagoMPFijo(@Body() body: { reservaIds: number[] }) {
    return this.pagosService.cancelarPagoMPFijo(body.reservaIds)
  }
}
