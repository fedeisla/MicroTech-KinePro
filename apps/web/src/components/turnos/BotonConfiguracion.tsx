'use client';

import React, { useState, useEffect } from 'react';
import { Settings, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getConfiguracion, updateConfiguracion } from '@/services/configuracionListaEsperaService';


export default function BotonConfiguracion() {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  
  const [config, setConfig] = useState({
    porcentajeListaEspera: 20,
    horasExpiracionEspera: 12.0
  });

  // Carga los datos reales del backend cuando el admin abre el modal
  useEffect(() => {
    if (abierto) {
      const cargarDatos = async () => {
        setCargando(true);
        try {
          const data = await getConfiguracion();
          setConfig({
            porcentajeListaEspera: data.porcentajeListaEspera,
            horasExpiracionEspera: data.horasExpiracionEspera
          });
        } catch (error) {
          toast.error('Error al cargar los parámetros del sistema');
        } finally {
          setCargando(false);
        }
      };
      cargarDatos();
    }
  }, [abierto]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await updateConfiguracion({
        porcentajeListaEspera: config.porcentajeListaEspera,
        horasExpiracionEspera: config.horasExpiracionEspera,
      });
      toast.success('Configuración actualizada correctamente');
      setAbierto(false);
    } catch (error) {
      toast.error('Hubo un problema al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm transition-colors text-sm font-medium h-[40px]"
      >
        <Settings className="w-[18px] h-[18px] text-slate-600" />
        <span className="hidden sm:inline">Configuración de listas de espera</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Configuración de listas de espera</h3>
              <button 
                onClick={() => setAbierto(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {cargando ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                  <p className="text-sm font-medium">Sincronizando con el servidor...</p>
                </div>
              ) : (
                <form onSubmit={handleGuardar} className="space-y-6">
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Sobrecupo para cada lista de espera (%)
                    </label>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                      Límite de pacientes que pueden anotarse una vez que el turno está lleno.
                    </p>
                    <div className="relative">
                      <input
                        type="number"
                        name="porcentajeListaEspera"
                        min="0"
                        max="100"
                        value={config.porcentajeListaEspera}
                        onChange={handleChange}
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-700 font-medium"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Vencimiento de la notificación (horas)
                    </label>
                    <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                      Tiempo máximo que se le da al paciente para confirmar el lugar liberado.
                    </p>
                    <div className="relative">
                      <input
                        type="number"
                        name="horasExpiracionEspera"
                        min="0.5"
                        step="0.5" 
                        value={config.horasExpiracionEspera}
                        onChange={handleChange}
                        className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-700 font-medium"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">hs</span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setAbierto(false)}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={guardando}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0066b2] hover:bg-blue-800 rounded-lg transition-colors shadow-sm disabled:opacity-70 cursor-pointer"
                    >
                      {guardando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Aplicar cambios
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}