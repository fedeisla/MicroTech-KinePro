'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getEstadisticas } from '@/services/estadisticasService'
import type { EstadisticasResponse } from '@/types/estadisticas'
import SeccionAcordeon from './SeccionAcordeon'
import GraficoBarras from './GraficoBarras'
import GraficoComparacion from './GraficoComparacion'

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  MERCADOPAGO: 'Mercado Pago',
}

function formatearMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}

function obtenerFechaHoy(): string {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const month = String(hoy.getMonth() + 1).padStart(2, '0')
  const day = String(hoy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function obtenerInicioAnio(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-01-01`
}

function MensajeVacio() {
  return (
    <p className="py-4 text-center text-sm text-slate-500">
      No se encontraron resultados
    </p>
  )
}

export default function EstadisticasPanel() {
  const fechaHoy = obtenerFechaHoy()
  const [desde, setDesde] = useState(obtenerInicioAnio())
  const [hasta, setHasta] = useState(fechaHoy)
  const [datos, setDatos] = useState<EstadisticasResponse | null>(null)
  const [consultado, setConsultado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVer() {
    setCargando(true)
    setError(null)
    try {
      const resultado = await getEstadisticas(desde, hasta)
      setDatos(resultado)
      setConsultado(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas')
      setDatos(null)
      setConsultado(false)
    } finally {
      setCargando(false)
    }
  }

  const totalIngresos = datos?.ingresos.items.reduce((acc, i) => acc + i.monto, 0) ?? 0

  function handleCambioHasta(valor: string) {
    setHasta(valor > fechaHoy ? fechaHoy : valor)
  }

  function handleCambioDesde(valor: string) {
    const fechaLimitada = valor > fechaHoy ? fechaHoy : valor
    setDesde(fechaLimitada)
    if (hasta < fechaLimitada) setHasta(fechaLimitada)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-center text-4xl font-bold tracking-tight text-kine-blue">
        Estadísticas
      </h1>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-center text-sm font-medium text-slate-600">
          Seleccionar rango de fechas
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-desde" className="text-sm text-slate-600">
              Desde
            </label>
            <input
              id="fecha-desde"
              type="date"
              value={desde}
              max={fechaHoy}
              onChange={(e) => handleCambioDesde(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-kine-blue focus:outline-none focus:ring-1 focus:ring-kine-blue"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="fecha-hasta" className="text-sm text-slate-600">
              Hasta
            </label>
            <input
              id="fecha-hasta"
              type="date"
              value={hasta}
              min={desde}
              max={fechaHoy}
              onChange={(e) => handleCambioHasta(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-kine-blue focus:outline-none focus:ring-1 focus:ring-kine-blue"
            />
          </div>
          <button
            type="button"
            onClick={handleVer}
            disabled={cargando || !desde || !hasta}
            className="flex items-center gap-2 rounded-xl bg-kine-blue px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-kine-blue-deep disabled:opacity-50"
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            Ver
          </button>
        </div>
        {error && (
          <p className="mt-3 text-center text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="space-y-3">
        <SeccionAcordeon titulo="Reprogramaciones">
          {!consultado ? (
            <p className="py-2 text-center text-sm text-slate-400">
              Seleccioná un rango de fechas y presioná Ver
            </p>
          ) : datos!.reprogramaciones.total === 0 ? (
            <MensajeVacio />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-kine-blue">
                  {datos!.reprogramaciones.total}
                </p>
                <p className="text-sm text-slate-600">
                  {datos!.reprogramaciones.total === 1
                    ? 'reprogramación realizada en el período seleccionado'
                    : 'reprogramaciones realizadas en el período seleccionado'}
                </p>
              </div>
              <GraficoComparacion
                etiqueta="Reservas reprogramadas"
                parte={datos!.reprogramaciones.reservasAfectadas}
                total={datos!.totalReservas}
              />
            </div>
          )}
        </SeccionAcordeon>

        <SeccionAcordeon titulo="Cancelaciones">
          {!consultado ? (
            <p className="py-2 text-center text-sm text-slate-400">
              Seleccioná un rango de fechas y presioná Ver
            </p>
          ) : datos!.cancelaciones.total === 0 ? (
            <MensajeVacio />
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-kine-blue">
                  {datos!.cancelaciones.total}
                </p>
                <p className="text-sm text-slate-600">
                  {datos!.cancelaciones.total === 1
                    ? 'cancelación registrada en el período seleccionado'
                    : 'cancelaciones registradas en el período seleccionado'}
                </p>
              </div>
              <GraficoComparacion
                etiqueta="Reservas canceladas"
                parte={datos!.cancelaciones.total}
                total={datos!.totalReservas}
              />
            </div>
          )}
        </SeccionAcordeon>

        <SeccionAcordeon titulo="Demanda por actividad">
          {!consultado ? (
            <p className="py-2 text-center text-sm text-slate-400">
              Seleccioná un rango de fechas y presioná Ver
            </p>
          ) : datos!.demandaActividad.items.length === 0 ? (
            <MensajeVacio />
          ) : (
            <GraficoBarras
              items={datos!.demandaActividad.items.map((i) => ({
                label: i.actividad,
                value: i.cantidad,
              }))}
            />
          )}
        </SeccionAcordeon>

        <SeccionAcordeon titulo="Ingresos totales">
          {!consultado ? (
            <p className="py-2 text-center text-sm text-slate-400">
              Seleccioná un rango de fechas y presioná Ver
            </p>
          ) : datos!.ingresos.items.length === 0 ? (
            <MensajeVacio />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-kine-blue/5 px-4 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total recaudado
                </p>
                <p className="text-2xl font-bold text-kine-blue-deep">
                  {formatearMonto(totalIngresos)}
                </p>
              </div>
              <GraficoBarras
                colorClass="bg-kine-blue-light"
                items={datos!.ingresos.items.map((i) => ({
                  label: METODO_LABELS[i.metodo] ?? i.metodo,
                  value: i.monto,
                  displayValue: formatearMonto(i.monto),
                }))}
              />
            </div>
          )}
        </SeccionAcordeon>
      </div>
    </div>
  )
}
