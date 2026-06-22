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

    const total = await this.prisma.reserva.count({
      where: {
        estado: EstadoReserva.CANCELADA,
        turno: { fecha: { gte: fechaDesde, lte: fechaHastaFin } },
      },
    });

    return { total };
  }

  async obtenerReprogramaciones(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const filtro = {
      cant_reprogramaciones: { gt: 0 },
      turno: { fecha: { gte: fechaDesde, lte: fechaHastaFin } },
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
        turno: { fecha: { gte: fechaDesde, lte: fechaHastaFin } },
      },
      select: {
        turno: { select: { tipoActividad: { select: { nombre: true } } } },
      },
    });

    const conteo = new Map<string, number>();
    for (const r of reservas) {
      const nombre = r.turno.tipoActividad.nombre;
      conteo.set(nombre, (conteo.get(nombre) ?? 0) + 1);
    }

    const items = Array.from(conteo.entries())
      .map(([actividad, cantidad]) => ({ actividad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return { items };
  }

  async obtenerIngresos(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const pagos = await this.prisma.pago.groupBy({
      by: ['metodo'],
      where: {
        estado: EstadoPago.COMPLETADO,
        metodo: { in: [MetodoPago.EFECTIVO, MetodoPago.MERCADOPAGO] },
        fecha_pago: { gte: fechaDesde, lte: fechaHastaFin },
      },
      _sum: { monto: true },
    });

    const items = pagos.map((p) => ({
      metodo: p.metodo,
      monto: Number(p._sum.monto ?? 0),
    }));

    return { items };
  }

  async obtenerTotalReservas(desde: string, hasta: string) {
    const { fechaDesde, fechaHastaFin } = this.validarRango(desde, hasta);

    const total = await this.prisma.reserva.count({
      where: {
        turno: { fecha: { gte: fechaDesde, lte: fechaHastaFin } },
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
          estado: { not: EstadoReserva.CANCELADA },
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
