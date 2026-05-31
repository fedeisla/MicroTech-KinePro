import React, { useState } from 'react';
import { Clock, Loader2, CalendarDays, ClipboardList, CheckCircle2, ArrowRight, ArrowLeft, TicketPercent } from 'lucide-react';
import { RangoHorarioBackend, Actividad } from '@/types/turno';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  mesActual: number;
  anioActual: number;
  diasSeleccionados: number[]; 
  horariosDelDia: RangoHorarioBackend[];
  cargandoHorarios: boolean;
  rangoSeleccionado: RangoHorarioBackend | null;
  setRangoSeleccionado: (rango: RangoHorarioBackend | null) => void;
  actividadSeleccionada: Actividad | null;
  setActividadSeleccionada: (act: Actividad | null) => void;
  handleConfirmarReservaFija: (fechas: Date[]) => void; 
}

export default function PanelMensual({
  mesActual, anioActual, diasSeleccionados, horariosDelDia, cargandoHorarios,
  rangoSeleccionado, setRangoSeleccionado, actividadSeleccionada, setActividadSeleccionada,
  handleConfirmarReservaFija
}: Props) {
  
  const [[paso, direccion], setPasoConfig] = useState<[1 | 2, number]>([1, 0]);

  const calcularFechasFijas = () => {
    if (diasSeleccionados.length === 0) return [];
    
    const primerDia = diasSeleccionados[0];
    const fechasGeneradas: Date[] = [];

    for (let i = 0; i < 4; i++) {
      const fecha = new Date(anioActual, mesActual, primerDia + (i * 7));
      fechasGeneradas.push(fecha);
    }
    
    return fechasGeneradas;
  };

  const fechasCalculadas = calcularFechasFijas();
  const handleSiguiente = () => setPasoConfig([2, 1]);
  const handleVolver = () => setPasoConfig([1, -1]);

  const variantesAnimacion = {
    entrar: (direccion: number) => ({
      x: direccion > 0 ? 50 : -50,
      opacity: 0
    }),
    centro: {
      x: 0,
      opacity: 1
    },
    salir: (direccion: number) => ({
      x: direccion > 0 ? -50 : 50,
      opacity: 0
    })
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-2 rounded-full bg-teal-600 transition-colors duration-500"></div>
        <div className={`flex-1 h-2 rounded-full transition-colors duration-500 ${paso === 2 ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait" custom={direccion}>
          {paso === 1 && (
            <motion.div
              key="paso1"
              custom={direccion}
              variants={variantesAnimacion}
              initial="entrar"
              animate="centro"
              exit="salir"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col absolute inset-0"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-4">Paso 1: Día y horario fijo</h3>
              
              <div className="mb-6">
                {diasSeleccionados.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50/60 rounded-2xl p-6 text-center border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                    <CalendarDays className="w-6 h-6 text-slate-300" />
                    <span>Elegí el día inicial en el calendario para ver los horarios.</span>
                  </div>
                ) : (
                  <>
                    {horariosDelDia.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                        {horariosDelDia.map((rango, idx) => (
                          <button
                            key={`rango-${idx}`}
                            onClick={() => { setRangoSeleccionado(rango); setActividadSeleccionada(null); }}
                            className={`py-2 px-3 text-center border text-xs rounded-xl font-semibold transition-all
                              ${rangoSeleccionado?.desde === rango.desde ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600/10' : 'border-slate-200 text-slate-600 hover:border-teal-600'}
                            `}
                          >
                            {rango.desde} - {rango.hasta}
                          </button>
                        ))}
                      </div>
                    ) : !cargandoHorarios && (
                      <div className="text-xs text-slate-500 text-center py-4">No hay horarios disponibles para este día.</div>
                    )}
                  </>
                )}
              </div>

              {rangoSeleccionado && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-teal-600" /> Actividad
                  </h3>
                  <div className="flex flex-col gap-2">
                    {rangoSeleccionado.actividades.map((act) => (
                      <button
                        key={`act-${act.id}`}
                        disabled={act.cuposDisponibles === 0}
                        onClick={() => setActividadSeleccionada(act)}
                        className={`text-left p-3 border rounded-xl text-sm transition-all flex justify-between items-center
                          ${act.cuposDisponibles === 0 ? 'bg-slate-50 border-slate-100 text-slate-400' : actividadSeleccionada?.id === act.id ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200 hover:border-teal-400'}
                        `}
                      >
                        <span className="font-semibold">{act.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100">
                <button
                  onClick={handleSiguiente}
                  disabled={diasSeleccionados.length === 0 || !rangoSeleccionado || !actividadSeleccionada}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2
                    ${diasSeleccionados.length > 0 && rangoSeleccionado && actividadSeleccionada ? 'bg-slate-800 text-white hover:bg-slate-900 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                  `}
                >
                  <span>Siguiente</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {paso === 2 && (
            <motion.div
              key="paso2"
              custom={direccion}
              variants={variantesAnimacion}
              initial="entrar"
              animate="centro"
              exit="salir"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex-1 flex flex-col absolute inset-0"
            >
              <button onClick={handleVolver} className="text-sm text-slate-500 font-semibold flex items-center gap-1 mb-4 hover:text-slate-800 transition-colors w-fit">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              
              <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen de la reserva</h3>
              
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mb-4">
                <p className="text-teal-800 font-semibold mb-1">{actividadSeleccionada?.nombre}</p>
                <p className="text-teal-600 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Las 4 sesiones a las {rangoSeleccionado?.desde} hs
                </p>
              </div>

              <div className="mb-4 overflow-y-auto max-h-[120px] custom-scrollbar pr-2">
                <p className="text-sm font-bold text-slate-700 mb-2">Fechas consecutivas ({fechasCalculadas.length} turnos):</p>
                <div className="flex flex-wrap gap-2">
                  {fechasCalculadas.map((fecha, idx) => (
                    <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold shadow-sm">
                      {fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mt-auto mb-6 shadow-sm">
                <TicketPercent className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <p className="text-amber-800 text-sm font-bold">20% de descuento</p>
                  <p className="text-amber-700 text-xs mt-0.5">Sujeto a validación de asistencia previa al momento del pago.</p>
                </div>
              </div>

              <button
                onClick={() => handleConfirmarReservaFija(fechasCalculadas)}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 bg-teal-600 text-white hover:bg-teal-700 active:scale-[0.98]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirmar {fechasCalculadas.length} turnos</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}