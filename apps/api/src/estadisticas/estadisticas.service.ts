import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EstadoPago, EstadoReserva, MetodoPago } from '@prisma/client';

@Injectable()
export class EstadisticasService {
  constructor(private prisma: PrismaService) {}

  private parseFecha(fecha: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!m) {
      throw new BadRequestException('La fecha debe estar en formato YYYY-MM-DD');
    }
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  }

  private validarRango(desde: string, hasta: string) {
    const fechaDesde = this.parseFecha(desde);
    const fechaHasta = this.parseFecha(hasta);
    if (fechaDesde > fechaHasta) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final');
    }
    const fechaHastaFin = new Date(fechaHasta);
    fechaHastaFin.setUTCHours(23, 59, 59, 999);
    return { fechaDesde, fechaHastaFin };
  }

  async obtenerCancelaciones(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    // Contabilizar cancelaciones según la fecha en que se realizó la acción
    const total = await this.prisma.reserva.count({
      where: {
        estado: EstadoReserva.CANCELADA,
        fecha_estado: { gte: fechaDesde, lte: fechaHastaFin },
      },
    });

    return { total };
  }

  async obtenerReprogramaciones(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    // Contabilizar reprogramaciones según la fecha en que se realizó la acción
    const filtro = {
      cant_reprogramaciones: { gt: 0 },
      fecha_estado: { gte: fechaDesde, lte: fechaHastaFin },
    };

    const [resultado, reservasAfectadas] = await Promise.all([
      this.prisma.reserva.aggregate({
        where: filtro,
        _sum: { cant_reprogramaciones: true },
      }),
      this.prisma.reserva.count({ where: filtro }),
    ]);

    return {
      total: resultado._sum.cant_reprogramaciones ?? 0,
      reservasAfectadas,
    };
  }

  async obtenerDemandaActividad(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const reservas = await this.prisma.reserva.findMany({
      where: {
        fecha_reserva: { gte: fechaDesde, lte: fechaHastaFin },
        estado: { not: EstadoReserva.CANCELADA },
      },
      select: {
        turno: {
          select: { tipoActividad_id: true },
        },
      },
    });

    const reservasPorActividad = new Map<number, number>();

    reservas.forEach((reserva) => {
      const tipoActividadId = reserva.turno?.tipoActividad_id;
      if (!tipoActividadId) {
        return;
      }

      reservasPorActividad.set(
        tipoActividadId,
        (reservasPorActividad.get(tipoActividadId) ?? 0) + 1,
      );
    });

    const items = Array.from(reservasPorActividad.entries())
      .map(([actividadId, cantidad]) => ({
        actividadId,
        cantidad,
      }))
      .filter((item) => item.cantidad > 0);

    if (items.length === 0) {
      return { items: [] };
    }

    const actividades = await this.prisma.tipoActividad.findMany({
      where: { id: { in: items.map((item) => item.actividadId) } },
      select: { id: true, nombre: true },
    });
    const nombresPorId = new Map(actividades.map((a) => [a.id, a.nombre]));

    const resultado = items
      .map((item) => ({
        actividad: nombresPorId.get(item.actividadId) ?? 'Desconocida',
        cantidad: item.cantidad,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { items: resultado };
  }

  async obtenerIngresos(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const pagos = await this.prisma.pago.findMany({
      where: {
        estado: EstadoPago.COMPLETADO,
        metodo: { in: [MetodoPago.EFECTIVO, MetodoPago.MERCADOPAGO] },
      },
      select: {
        metodo: true,
        monto: true,
        fecha_pago: true,
        reserva: {
          select: {
            fecha_reserva: true,
          },
        },
      },
    });

    const acumuladoPorMetodo = new Map<string, number>();

    for (const pago of pagos) {
      const fechaCobro = pago.fecha_pago ?? pago.reserva?.fecha_reserva;
      if (!fechaCobro) continue;

      const estaEnRango = fechaCobro >= fechaDesde && fechaCobro <= fechaHastaFin;
      if (!estaEnRango) continue;

      const metodo = pago.metodo;
      const monto = Number(pago.monto ?? 0);
      acumuladoPorMetodo.set(metodo, (acumuladoPorMetodo.get(metodo) ?? 0) + monto);
    }

    const items = Array.from(acumuladoPorMetodo.entries()).map(([metodo, monto]) => ({
      metodo: metodo as MetodoPago,
      monto,
    }));

    return { items };
  }

  async obtenerTotalReservas(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const total = await this.prisma.reserva.count({
      where: {
        fecha_reserva: { gte: fechaDesde, lte: fechaHastaFin },
      },
    });

    return total;
  }

  async obtenerAsistencia(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const filtroFechaTurno = { fecha: { gte: fechaDesde, lte: fechaHastaFin } };
    const filtroReservaEnPeriodo = { turno: filtroFechaTurno };

    const totalTurnos = await this.prisma.turno.count({
      where: filtroFechaTurno,
    });

    if (totalTurnos === 0) {
      return { totalTurnos: 0, totalInscriptos: 0, presentes: 0, ausentes: 0 };
    }

    const [totalInscriptos, ausentes] = await Promise.all([
      this.prisma.reserva.count({
        where: {
          ...filtroReservaEnPeriodo,
          estado: { in: [EstadoReserva.ASISTIO, EstadoReserva.AUSENTE] },
        },
      }),
      this.prisma.reserva.count({
        where: { ...filtroReservaEnPeriodo, estado: EstadoReserva.AUSENTE },
      }),
    ]);

    const presentes = totalInscriptos - ausentes;

    return { totalTurnos, totalInscriptos, presentes, ausentes };
  }

  async obtenerTodas(desde: string, hasta: string) {
    const [cancelaciones, reprogramaciones, demandaActividad, ingresos, totalReservas, asistencia] =
      await Promise.all([
        this.obtenerCancelaciones(desde, hasta),
        this.obtenerReprogramaciones(desde, hasta),
        this.obtenerDemandaActividad(desde, hasta),
        this.obtenerIngresos(desde, hasta),
        this.obtenerTotalReservas(desde, hasta),
        this.obtenerAsistencia(desde, hasta),
      ]);

    return { totalReservas, cancelaciones, reprogramaciones, demandaActividad, ingresos, asistencia };
  }
}
