import React, { useState, useEffect } from 'react';
import { fechasMismoDiaSemana, formatearFechaLocal, parseFechaLocal } from '@/lib/fechas';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react';
import { RangoHorarioBackend, Actividad } from '@/types/turno';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getTurnoById } from '@/services/turnosService';
import { chequearDescuento } from '@/services/reservasService';
import { listaEsperaService } from '@/services/listaEsperaService';

interface Props {
  mesActual: number;
  anioActual: number;
  diasSeleccionados: number[]; 
  diasLlenos: number[];
  horariosDelDia: RangoHorarioBackend[];
  cargandoHorarios: boolean;
  rangoSeleccionado: RangoHorarioBackend | null;
  setRangoSeleccionado: (rango: RangoHorarioBackend | null) => void;
  actividadSeleccionada: Actividad | null;
  setActividadSeleccionada: (act: Actividad | null) => void;
  handleConfirmarReservaFija: (fechas: Date[]) => void; 
  adminMode?: boolean;
  adminEmail?: string;
  setAdminEmail?: (email: string) => void;
}

export default function PanelMensual({
  mesActual, anioActual, diasSeleccionados, diasLlenos, horariosDelDia, cargandoHorarios,
  rangoSeleccionado, setRangoSeleccionado, actividadSeleccionada, setActividadSeleccionada,
  handleConfirmarReservaFija, adminMode = false, adminEmail = '', setAdminEmail
}: Props) {
  
  const [[paso, direccion], setPasoConfig] = useState<[1 | 2, number]>([1, 0]);
  const [fechaHasta, setFechaHasta] = useState('');
  const [prioridadEspera, setPrioridadEspera] = useState<number>(2);
  const { usuario } = useAuth();

  const estaLleno = actividadSeleccionada ? actividadSeleccionada.cuposDisponibles <= 0 : false;

  const calcularFechasFijas = () => {
    if (diasSeleccionados.length === 0 || !fechaHasta) return [];
    const primerDia = diasSeleccionados[0];
    const inicio = new Date(anioActual, mesActual, primerDia);
    const fin = parseFechaLocal(fechaHasta);
    return fechasMismoDiaSemana(inicio, fin);
  };

  const fechasCalculadas = calcularFechasFijas();

  const handleAgregarAListaEspera = async () => {
    try {
      const turnoIds = [actividadSeleccionada!.id]; 
      if (adminMode) {
        if (!adminEmail) return toast.error('Se requiere email del paciente');
        await listaEsperaService.inscribirTurnoFijoPresencial(adminEmail, turnoIds);
      } else {
        await listaEsperaService.inscribirTurnoFijoVirtual(turnoIds);
      }
      toast.success('Solicitud agregada a la lista de espera');
    } catch (err: any) {
      toast.error('Error al agregar a lista de espera', { description: err.message });
    }
  };

  useEffect(() => {
    if (diasSeleccionados.length === 0) { setFechaHasta(''); return; }
    const primerDia = diasSeleccionados[0];
    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const finSugerido = new Date(anioActual, mesActual, Math.min(primerDia + 21, ultimoDiaMes));
    setFechaHasta(formatearFechaLocal(finSugerido));
  }, [diasSeleccionados, mesActual, anioActual]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra de progreso verde */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-2 rounded-full bg-teal-600"></div>
        <div className={`flex-1 h-2 rounded-full ${paso === 2 ? 'bg-teal-600' : 'bg-slate-200'}`}></div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          {paso === 1 && (
            <motion.div key="paso1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col absolute inset-0">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Seleccionar horario</h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
                {horariosDelDia.map((rango, idx) => {
                  const isSelected = rangoSeleccionado?.desde === rango.desde;
                  return (
                    <button key={idx} onClick={() => { setRangoSeleccionado(rango); setActividadSeleccionada(null); }}
                      className={`py-3 px-3 border text-xs rounded-xl font-semibold transition-all 
                      ${isSelected ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-400'}`}>
                      {rango.desde} - {rango.hasta}
                    </button>
                  );
                })}
              </div>

              {rangoSeleccionado && (
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-slate-500" /> Actividades</h3>
                  {rangoSeleccionado.actividades.map((act) => (
                    <button key={act.id} onClick={() => setActividadSeleccionada(act)}
                      className={`w-full text-left p-4 border rounded-xl text-sm mb-2 flex justify-between items-center transition-all
                      ${actividadSeleccionada?.id === act.id ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 hover:border-amber-400'}`}>
                      <span className="font-semibold">{act.nombre}</span>
                      {act.cuposDisponibles <= 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold uppercase">Agotado</span>}
                    </button>
                  ))}
                </div>
              )}
              
              <button 
                onClick={() => setPasoConfig([2, 1])} 
                disabled={!actividadSeleccionada} 
                className="w-full mt-auto py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
              >
                Siguiente
              </button>
            </motion.div>
          )}

          {paso === 2 && (
            <motion.div key="paso2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col absolute inset-0 overflow-y-auto">
              <button onClick={() => setPasoConfig([1, -1])} className="text-sm text-slate-500 mb-4 flex items-center gap-1 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Volver</button>
              
              {estaLleno ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> ¡Turno sin cupos!</p>
                  <p className="text-xs text-amber-700 mb-3">Estás seleccionando un horario completo. ¿Deseas unirte a la lista de espera?</p>
                </div>
              ) : (
                <div className="bg-teal-50 p-4 rounded-xl mb-4 text-sm font-semibold text-teal-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {actividadSeleccionada?.nombre}
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 mb-1 block">Fecha límite de reserva</label>
                <input type="date" disabled value={fechaHasta} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              
              <button 
                onClick={estaLleno ? handleAgregarAListaEspera : () => handleConfirmarReservaFija(fechasCalculadas)}
                className={`w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${estaLleno ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
              >
                {estaLleno ? (
                    <><AlertCircle className="w-4 h-4" /> Agregar a Lista de Espera</>
                ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Confirmar Reserva</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}