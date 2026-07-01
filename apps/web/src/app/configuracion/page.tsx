'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useRequireRole } from '@/hooks/useAuth'
import { obtenerDescuento, actualizarDescuento } from '@/services/configuracionService'

export default function ConfiguracionPage() {
  const { autorizado, cargando } = useRequireRole(['OWNER'])
  const [porcentajeActual, setPorcentajeActual] = useState<number | null>(null)
  const [porcentajeInput, setPorcentajeInput] = useState<string>('')
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null)
  const [loadingGet, setLoadingGet] = useState(false)
  const [loadingPut, setLoadingPut] = useState(false)

  useEffect(() => {
    if (!autorizado) return
    setLoadingGet(true)
    obtenerDescuento()
      .then((data) => {
        setPorcentajeActual(data.porcentaje)
        setPorcentajeInput(String(data.porcentaje))
        setActualizadoEn(data.actualizado_en)
      })
      .catch((err) => {
        toast.error('No se pudo cargar la configuración', {
          description: err.message ?? 'Error desconocido',
        })
      })
      .finally(() => setLoadingGet(false))
  }, [autorizado])

  const handleGuardar = async () => {
    const numero = Number(porcentajeInput)
    if (isNaN(numero)) {
      toast.error('El porcentaje debe ser un número')
      return
    }
    if (numero < 0 || numero > 100) {
      toast.error('El porcentaje debe estar entre 0 y 100')
      return
    }

    setLoadingPut(true)
    try {
      const res = await actualizarDescuento(numero)
      setPorcentajeActual(res.porcentaje)
      toast.success(res.message)
      // Refrescar la fecha de actualización
      const nueva = await obtenerDescuento()
      setActualizadoEn(nueva.actualizado_en)
    } catch (err: any) {
      toast.error('No se pudo actualizar la configuración', {
        description: err.message ?? 'Error desconocido',
      })
    } finally {
      setLoadingPut(false)
    }
  }

  if (cargando) {
    return <div className="p-8 text-slate-600">Cargando…</div>
  }
  if (!autorizado) {
    return null
  }

  const formatearFecha = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Configuración del sistema</h1>
      <p className="text-slate-500 mb-8">
        Ajustá el porcentaje de descuento que se aplica automáticamente a las reservas de turnos fijos
        para pacientes con buena conducta.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Descuento mensual</h2>

        {loadingGet ? (
          <p className="text-slate-500">Cargando configuración…</p>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-500">Valor actual</p>
              <p className="text-2xl font-bold text-teal-700">
                {porcentajeActual !== null ? `${porcentajeActual}%` : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Última actualización: {formatearFecha(actualizadoEn)}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Nuevo porcentaje (0 a 100)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={porcentajeInput}
                  onChange={(e) => setPorcentajeInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={loadingPut}
                />
                <span className="flex items-center px-3 text-slate-500 font-semibold">%</span>
              </div>

              <button
                onClick={handleGuardar}
                disabled={loadingPut}
                className="mt-4 w-full py-2.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                {loadingPut ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}