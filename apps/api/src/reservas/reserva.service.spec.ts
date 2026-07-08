import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { ReservaService } from './reserva.service';

describe('ReservaService.validarTurnoNoPasado', () => {
  const service = new ReservaService({} as any, {} as any, {} as any, {} as any, {} as any);

  it('rechaza turnos del horario anterior al siguiente horario válido', () => {
    const hoy = new Date();
    const turnoAnterior = new Date(hoy);
    turnoAnterior.setDate(hoy.getDate() - 1);
    turnoAnterior.setHours(23, 0, 0, 0);

    expect(() =>
      (service as any).validarTurnoNoPasado({
        fecha: new Date(Date.UTC(turnoAnterior.getUTCFullYear(), turnoAnterior.getUTCMonth(), turnoAnterior.getUTCDate())),
        hora_inicio: new Date(Date.UTC(1970, 0, 1, turnoAnterior.getUTCHours(), turnoAnterior.getUTCMinutes())),
      }),
    ).toThrow(BadRequestException);
  });

  it('acepta turnos del siguiente horario en adelante', () => {
    const hoy = new Date();
    const turnoFuturo = new Date(hoy);
    turnoFuturo.setHours(hoy.getHours() + 2, 0, 0, 0);

    expect(() =>
      (service as any).validarTurnoNoPasado({
        fecha: new Date(Date.UTC(turnoFuturo.getUTCFullYear(), turnoFuturo.getUTCMonth(), turnoFuturo.getUTCDate())),
        hora_inicio: new Date(Date.UTC(1970, 0, 1, turnoFuturo.getUTCHours(), turnoFuturo.getUTCMinutes())),
      }),
    ).not.toThrow();
  });
});
