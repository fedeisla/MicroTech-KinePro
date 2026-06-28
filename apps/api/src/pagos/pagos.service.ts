import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { NotificacionesService } from '@/notificaciones/notificaciones.service'
import { CrearPagoDto } from './pagos.dto'
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

@Injectable()
export class PagosService {
  private mpClient: MercadoPagoConfig
  private frontUrl: string

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private notificacionesService: NotificacionesService,
  ) {
    const accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en .env')
    }
    this.mpClient = new MercadoPagoConfig({ accessToken })
    this.frontUrl = this.configService.get<string>('FRONT_URL') ?? 'http://localhost:3000'
  }

  // ============================================================
  // Registro manual (efectivo / transferencia / etc) — sigue igual
  // ============================================================
  async registrar(dto: CrearPagoDto) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: dto.reserva_id },
      include: { turno: { include: { tipoActividad: true } } },
    })
    if (!reserva) {
      throw new NotFoundException('La reserva no existe')
    }
  
    const pagoExistente = await this.prisma.pago.findFirst({
      where: { reserva_id: dto.reserva_id, estado: 'COMPLETADO' },
    })
    if (pagoExistente) {
      throw new BadRequestException('La reserva ya tiene un pago registrado')
    }
  
    // Si el front envía un monto explícito (ej. precio con descuento aplicado), lo usamos.
    // Si no, usamos el precio completo del tipo de actividad.
    const monto = dto.monto !== undefined ? dto.monto : Number(reserva.turno.tipoActividad.precio)
  
    await this.prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: {
          reserva_id: dto.reserva_id,
          monto,
          metodo: dto.metodo,
          estado: 'COMPLETADO',
          fecha_pago: new Date(),
        },
      })
      await tx.reserva.update({
        where: { id: dto.reserva_id },
        data: { estado: 'CONFIRMADA' },
      })
    })
  
    return { message: 'Pago registrado correctamente' }
  }

  // ============================================================
  // Crear preference de MercadoPago para una reserva
  // ============================================================
  async crearPreferenceMP(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { turno: { include: { tipoActividad: true } } },
    })
    if (!reserva) {
      throw new NotFoundException('La reserva no existe')
    }
    if (reserva.estado !== 'PENDIENTE') {
      throw new BadRequestException('La reserva no está en estado pendiente de pago')
    }

    const monto = Number(reserva.turno.tipoActividad.precio)
    const titulo = `Turno - ${reserva.turno.tipoActividad.nombre}`

    const preferenceClient = new Preference(this.mpClient)
    const preferenceResp = await preferenceClient.create({
      body: {
        items: [
          {
            id: `reserva-${reserva.id}`,
            title: titulo,
            quantity: 1,
            unit_price: monto,
            currency_id: 'ARS',
          },
        ],
        external_reference: String(reserva.id),
        back_urls: {
          success: `${this.frontUrl}/pago/exitoso`,
          failure: `${this.frontUrl}/pago/fallido`,
          pending: `${this.frontUrl}/pago/pendiente`,
        },
      },
    })

    // Crear el Pago en estado PENDIENTE
    await this.prisma.pago.create({
      data: {
        reserva_id: reserva.id,
        monto,
        metodo: 'MERCADOPAGO',
        estado: 'PENDIENTE',
        mercadopago_preference_id: preferenceResp.id ?? null,
      },
    })

    return {
      init_point: preferenceResp.init_point,
      preference_id: preferenceResp.id,
    }
  }

  // ============================================================
  // Confirmar pago tras retorno de MP
  // ============================================================
  async confirmarPagoMP(paymentId: string) {
    const paymentClient = new Payment(this.mpClient)
    const payment = await paymentClient.get({ id: paymentId })

    if (!payment.external_reference) {
      throw new BadRequestException('Pago sin referencia interna')
    }

    const reservaId = Number(payment.external_reference)
    const reserva = await this.prisma.reserva.findUnique({ where: { id: reservaId } })
    if (!reserva) {
      throw new NotFoundException('La reserva referenciada no existe')
    }

    const pago = await this.prisma.pago.findFirst({
      where: { reserva_id: reservaId, metodo: 'MERCADOPAGO' },
      orderBy: { id: 'desc' },
    })
    if (!pago) {
      throw new NotFoundException('No se encontró el pago asociado')
    }

    if (payment.status === 'approved') {
      await this.prisma.$transaction(async (tx) => {
        await tx.pago.update({
          where: { id: pago.id },
          data: {
            estado: 'COMPLETADO',
            fecha_pago: new Date(),
            mercadopago_payment_id: String(paymentId),
          },
        })
        await tx.reserva.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADA' },
        })
      })
      await this.crearNotificacionReservaConfirmada(reservaId)
      return { status: 'ok', message: 'Pago confirmado' }
    }

    // Pagos rechazados, en proceso, etc.
    await this.prisma.pago.update({
      where: { id: pago.id },
      data: {
        estado: payment.status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE',
        mercadopago_payment_id: String(paymentId),
      },
    })

    if (payment.status === 'rejected') {
      // Liberar la reserva si el pago se rechazó
      await this.prisma.$transaction(async (tx) => {
        await tx.reserva.update({
          where: { id: reservaId },
          data: { estado: 'CANCELADA' },
        })
        await tx.turno.update({
          where: { id: reserva.turno_id },
          data: { cantidad_inscriptos: { decrement: 1 } },
        })
      })
      return { status: 'rechazado', message: 'El pago fue rechazado por MercadoPago' }
    }

    return { status: 'pendiente', message: 'El pago aún está pendiente' }
  }

  // ============================================================
  // Cancelar reserva si el paciente canceló el pago en MP
  // ============================================================
  async cancelarReservaPorPagoCancelado(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id: reservaId } })
    if (!reserva) return { message: 'Reserva no encontrada' }
    if (reserva.estado !== 'PENDIENTE') return { message: 'Reserva no está pendiente' }

    await this.prisma.$transaction(async (tx) => {
      await tx.reserva.update({
        where: { id: reservaId },
        data: { estado: 'CANCELADA' },
      })
      await tx.turno.update({
        where: { id: reserva.turno_id },
        data: { cantidad_inscriptos: { decrement: 1 } },
      })
    })
    return { message: 'Reserva cancelada' }
  }

  // ============================================================
  // Verificar pago consultando MP por external_reference
  // ============================================================
  async verificarPagoMP(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({ where: { id: reservaId } })
    if (!reserva) throw new NotFoundException('La reserva no existe')
    
    if (reserva.estado === 'CONFIRMADA') {
      return { status: 'ok', message: 'Pago confirmado' }
    }
    if (reserva.estado === 'CANCELADA') {
      return { status: 'cancelado', message: 'La reserva fue cancelada' }
    }
  
    const paymentClient = new Payment(this.mpClient)
    const results: any = await paymentClient.search({
      options: { external_reference: String(reservaId) },
    })
  
    const approved = results?.results?.find((p: any) => p.status === 'approved')

    if (approved) {
      await this.prisma.$transaction(async (tx) => {
        const pago = await tx.pago.findFirst({
          where: { reserva_id: reservaId, metodo: 'MERCADOPAGO' },
        })
        if (pago && pago.estado !== 'COMPLETADO') {
          await tx.pago.update({
            where: { id: pago.id },
            data: {
              estado: 'COMPLETADO',
              fecha_pago: new Date(),
              mercadopago_payment_id: String(approved.id),
            },
          })
        }
        await tx.reserva.update({
          where: { id: reservaId },
          data: { estado: 'CONFIRMADA' },
        })
      })
      await this.crearNotificacionReservaConfirmada(reservaId)
      return { status: 'ok', message: 'Pago confirmado' }
    }
    
    // Si no hay aprobado, ver si hay rechazado
    const rejected = results?.results?.find((p: any) => p.status === 'rejected')
    if (rejected) {
      await this.prisma.$transaction(async (tx) => {
        const pago = await tx.pago.findFirst({
          where: { reserva_id: reservaId, metodo: 'MERCADOPAGO' },
        })
        if (pago && pago.estado !== 'RECHAZADO') {
          await tx.pago.update({
            where: { id: pago.id },
            data: {
              estado: 'RECHAZADO',
              mercadopago_payment_id: String(rejected.id),
            },
          })
        }
        await tx.reserva.update({
          where: { id: reservaId },
          data: { estado: 'CANCELADA' },
        })
        await tx.turno.update({
          where: { id: reserva.turno_id },
          data: { cantidad_inscriptos: { decrement: 1 } },
        })
      })
      return { status: 'rechazado', message: 'El pago fue rechazado por MercadoPago' }
    }
    
    return { status: 'pendiente', message: 'Aún no se detectó pago aprobado' }
  }

  private async crearNotificacionReservaConfirmada(reservaId: number) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: {
        turno: { include: { tipoActividad: true } },
        paciente: { include: { usuario: true } },
      },
    })
    if (!reserva || !reserva.paciente?.usuario) return

    const turno = reserva.turno
    const fechaTurno = new Date(Date.UTC(
      turno.fecha.getUTCFullYear(),
      turno.fecha.getUTCMonth(),
      turno.fecha.getUTCDate(),
      turno.hora_inicio.getUTCHours(),
      turno.hora_inicio.getUTCMinutes(),
    ))
    const fechaStr = fechaTurno.toLocaleDateString('es-AR')
    const horaStr = turno.hora_inicio.getUTCHours().toString().padStart(2, '0') + ':' + turno.hora_inicio.getUTCMinutes().toString().padStart(2, '0')

    await this.notificacionesService.crearNotificacion({
      pacienteId: reserva.paciente_id,
      reservaId: reserva.id,
      titulo: 'Turno confirmado',
      descripcion: `Su turno para la actividad ${turno.tipoActividad.nombre} ha sido confirmado para el día ${fechaStr} a las ${horaStr}hs.`,
      tipo: 'INFORMATIVA',
      canal: 'EMAIL',
      enviarEmail: true,
      email: reserva.paciente.usuario.email,
    })

    const fechaEnvioRecordatorio = new Date(fechaTurno.getTime() - 24 * 60 * 60 * 1000)
    const enviarRecordatorioAhora = fechaEnvioRecordatorio.getTime() <= Date.now()
    await this.notificacionesService.crearNotificacion({
      pacienteId: reserva.paciente_id,
      reservaId: reserva.id,
      titulo: 'Recordatorio de turno confirmado',
      descripcion: `Recordatorio de turno confirmado para la actividad ${turno.tipoActividad.nombre} el día ${fechaStr} a las ${horaStr}hs.`,
      tipo: 'RECORDATORIO',
      canal: 'EMAIL',
      fechaEnvio: enviarRecordatorioAhora ? new Date() : fechaEnvioRecordatorio,
      enviarEmail: enviarRecordatorioAhora,
      email: reserva.paciente.usuario.email,
    })
  }

  // ============================================================
  // Crear preference de MercadoPago para N reservas (turnos fijos)
  // ============================================================
  async crearPreferenceMPFijo(reservaIds: number[]) {
    if (!reservaIds || reservaIds.length === 0) {
      throw new BadRequestException('Debe indicar al menos una reserva')
    }

    const reservas = await this.prisma.reserva.findMany({
      where: { id: { in: reservaIds } },
      include: { turno: { include: { tipoActividad: true } } },
    })

    if (reservas.length !== reservaIds.length) {
      throw new NotFoundException('Alguna de las reservas no existe')
    }

    // Validar que todas son del mismo paciente y de la misma actividad
    const pacienteIds = new Set(reservas.map((r) => r.paciente_id))
    if (pacienteIds.size !== 1) {
      throw new BadRequestException('Las reservas no pertenecen al mismo paciente')
    }
    const actividadIds = new Set(reservas.map((r) => r.turno.tipoActividad_id))
    if (actividadIds.size !== 1) {
      throw new BadRequestException('Las reservas deben ser de la misma actividad')
    }

    // Validar que todas están pendientes (sin pago aprobado)
    for (const r of reservas) {
      if (r.estado !== 'PENDIENTE') {
        throw new BadRequestException(`La reserva ${r.id} no está en estado pendiente de pago`)
      }
    }

    const pacienteId = reservas[0].paciente_id
    const actividad = reservas[0].turno.tipoActividad
    const precioBase = Number(actividad.precio)

    // Chequear descuento
    const ausencias = await this.prisma.reserva.count({
      where: { paciente_id: pacienteId, estado: 'AUSENTE' },
    })
    const reservasConReprog = await this.prisma.reserva.findMany({
      where: { paciente_id: pacienteId, cant_reprogramaciones: { gt: 0 } },
      select: { cant_reprogramaciones: true },
    })
    const totalReprog = reservasConReprog.reduce((acc, c) => acc + c.cant_reprogramaciones, 0)
    const aplicaDescuento = ausencias < 2 && totalReprog < 2
    const precioPorReserva = aplicaDescuento ? precioBase * 0.8 : precioBase

    const cantidad = reservas.length
    const firstReservaId = Math.min(...reservaIds)
    const titulo = `Turnos fijos - ${actividad.nombre}`

    const preferenceClient = new Preference(this.mpClient)
    const preferenceResp = await preferenceClient.create({
      body: {
        items: [
          {
            id: `fijo-${firstReservaId}`,
            title: titulo,
            quantity: cantidad,
            unit_price: precioPorReserva,
            currency_id: 'ARS',
          },
        ],
        external_reference: `fijo-${firstReservaId}`,
        back_urls: {
          success: `${this.frontUrl}/pago/exitoso`,
          failure: `${this.frontUrl}/pago/fallido`,
          pending: `${this.frontUrl}/pago/pendiente`,
        },
      },
    })

    // Crear N Pagos en estado PENDIENTE, todos con el mismo preference_id
    await this.prisma.$transaction(async (tx) => {
      for (const r of reservas) {
        await tx.pago.create({
          data: {
            reserva_id: r.id,
            monto: precioPorReserva,
            metodo: 'MERCADOPAGO',
            estado: 'PENDIENTE',
            mercadopago_preference_id: preferenceResp.id ?? null,
          },
        })
      }
    })

    return {
      init_point: preferenceResp.init_point,
      preference_id: preferenceResp.id,
      grupoId: firstReservaId,
    }
  }

  // ============================================================
  // Verificar pago de un grupo de reservas fijas
  // ============================================================
  async verificarPagoMPFijo(grupoId: number) {
    // Buscamos un pago "ancla" para sacar el preference_id compartido
    const pagoAncla = await this.prisma.pago.findFirst({
      where: { reserva_id: grupoId, metodo: 'MERCADOPAGO' },
      orderBy: { id: 'desc' },
    })
    if (!pagoAncla || !pagoAncla.mercadopago_preference_id) {
      throw new NotFoundException('No se encontró el pago grupal')
    }

    const pagosGrupo = await this.prisma.pago.findMany({
      where: { mercadopago_preference_id: pagoAncla.mercadopago_preference_id },
      include: { reserva: true },
    })

    // Si ya está confirmado el grupo entero
    if (pagosGrupo.every((p) => p.estado === 'COMPLETADO')) {
      return { status: 'ok', message: 'Pago confirmado' }
    }
    if (pagosGrupo.every((p) => p.estado === 'RECHAZADO')) {
      return { status: 'rechazado', message: 'El pago fue rechazado por MercadoPago' }
    }

    // Consultar a MP por external_reference
    const paymentClient = new Payment(this.mpClient)
    const results: any = await paymentClient.search({
      options: { external_reference: `fijo-${grupoId}` },
    })

    const approved = results?.results?.find((p: any) => p.status === 'approved')

    if (approved) {
      await this.prisma.$transaction(async (tx) => {
        for (const p of pagosGrupo) {
          if (p.estado !== 'COMPLETADO') {
            await tx.pago.update({
              where: { id: p.id },
              data: {
                estado: 'COMPLETADO',
                fecha_pago: new Date(),
                mercadopago_payment_id: String(approved.id),
              },
            })
          }
          if (p.reserva.estado !== 'CONFIRMADA') {
            await tx.reserva.update({
              where: { id: p.reserva_id },
              data: { estado: 'CONFIRMADA' },
            })
          }
        }

        // Auditoría del descuento (si aplicó al momento del pago)
        const pacienteId = pagosGrupo[0].reserva.paciente_id
        const precioReserva = Number(pagosGrupo[0].monto)
        const ahora = new Date()
        const mesAplicable = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1))
        // Si el monto < precio normal de la actividad, hubo descuento (chequeo barato)
        const reservaSample = await tx.reserva.findUnique({
          where: { id: pagosGrupo[0].reserva_id },
          include: { turno: { include: { tipoActividad: true } } },
        })
        if (reservaSample && precioReserva < Number(reservaSample.turno.tipoActividad.precio)) {
          await tx.descuento.create({
            data: {
              paciente_id: pacienteId,
              porcentaje: 20,
              motivo: 'Reserva de turnos fijos sin ausencias ni reprogramaciones',
              mes_aplicable: mesAplicable,
              utilizado: true,
            },
          })
        }
      })
      for (const p of pagosGrupo) {
        if (p.reserva.estado !== 'CONFIRMADA') {
          await this.crearNotificacionReservaConfirmada(p.reserva_id)
        }
      }
      return { status: 'ok', message: 'Pago confirmado' }
    }

    const rejected = results?.results?.find((p: any) => p.status === 'rejected')
    if (rejected) {
      await this.prisma.$transaction(async (tx) => {
        for (const p of pagosGrupo) {
          await tx.pago.update({
            where: { id: p.id },
            data: {
              estado: 'RECHAZADO',
              mercadopago_payment_id: String(rejected.id),
            },
          })
          await tx.reserva.update({
            where: { id: p.reserva_id },
            data: { estado: 'CANCELADA' },
          })
          await tx.turno.update({
            where: { id: p.reserva.turno_id },
            data: { cantidad_inscriptos: { decrement: 1 } },
          })
        }
      })
      return { status: 'rechazado', message: 'El pago fue rechazado por MercadoPago' }
    }

    return { status: 'pendiente', message: 'Aún no se detectó pago aprobado' }
  }

  // ============================================================
  // Cancelar pago grupal (timeout / cancelación del usuario)
  // ============================================================
  async cancelarPagoMPFijo(reservaIds: number[]) {
    if (!reservaIds || reservaIds.length === 0) return { message: 'Nada que cancelar' }

    const reservas = await this.prisma.reserva.findMany({
      where: { id: { in: reservaIds } },
    })

    await this.prisma.$transaction(async (tx) => {
      for (const r of reservas) {
        if (r.estado === 'PENDIENTE') {
          await tx.reserva.update({
            where: { id: r.id },
            data: { estado: 'CANCELADA' },
          })
          await tx.turno.update({
            where: { id: r.turno_id },
            data: { cantidad_inscriptos: { decrement: 1 } },
          })
        }
      }
    })

    return { message: 'Reservas canceladas' }
  }
}