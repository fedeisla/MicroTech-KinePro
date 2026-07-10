import React, { useState, useEffect } from 'react';
import { fechasMismoDiaSemana, formatearFechaLocal, parseFechaLocal } from '@/lib/fechas';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, AlertCircle, ClipboardList, TicketPercent } from 'lucide-react';
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
  handleConfirmarReservaFija: (fechas: Date[]) => Promise<void>; 
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
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  
  const [precioUnitario, setPrecioUnitario] = useState(0);
  const [aplicaDescuento, setAplicaDescuento] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [faltaDisponibilidad, setFaltaDisponibilidad] = useState(false);

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
  const hayConflictoDeCupos = fechasCalculadas.some(fecha => diasLlenos.includes(fecha.getDate()));
  const mostrarPrioridad1 = faltaDisponibilidad || hayConflictoDeCupos;

  const handleAgregarAListaEspera = async (prioridad: number = 2) => {
    if (!actividadSeleccionada) return;

    try {
      
      const fechasString = fechasCalculadas.map(f => formatearFechaLocal(f));
      
      if (adminMode) {
        if (!adminEmail) return toast.error('Se requiere email del paciente');
        await listaEsperaService.inscribirTurnoFijoPresencial(adminEmail, actividadSeleccionada.id, fechasString);
      } else {
        await listaEsperaService.inscribirTurnoFijoVirtual(actividadSeleccionada.id, fechasString);
      }
      
      toast.success(`Solicitud agregada a la lista de espera (Prioridad ${prioridad})`);
      setFaltaDisponibilidad(false);
    } catch (err: any) {
      toast.error('Error al anotar en la lista de espera', { description: err.message });
    }
  };

  const ejecutarReservaFija = async () => {
    setCargando(true);
    setFaltaDisponibilidad(false);
    try {
      await handleConfirmarReservaFija(fechasCalculadas);
    } catch (err: any) {
      setFaltaDisponibilidad(true);
      toast.error('No hay cupo disponible en todas las fechas.', {
        description: 'Podés anotarte en la lista de espera.'
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (diasSeleccionados.length === 0) { setFechaHasta(''); return; }
    const primerDia = diasSeleccionados[0];
    const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).getDate();
    const finSugerido = new Date(anioActual, mesActual, Math.min(primerDia + 21, ultimoDiaMes));
    setFechaHasta(formatearFechaLocal(finSugerido));
  }, [diasSeleccionados, mesActual, anioActual]);

  useEffect(() => {
    if (!actividadSeleccionada) {
      setPrecioUnitario(0);
      return;
    }
    getTurnoById(actividadSeleccionada.id)
      .then((t) => setPrecioUnitario(t.precio ?? 0))
      .catch(() => setPrecioUnitario(0));
  }, [actividadSeleccionada]);

  useEffect(() => {
    const email = adminMode ? adminEmail : usuario?.email;
    if (!email) {
      setAplicaDescuento(false);
      setPorcentajeDescuento(0);
      return;
    }
    chequearDescuento(email)
      .then((res) => {
        setAplicaDescuento(res.aplica);
        setPorcentajeDescuento(res.porcentaje);
      })
      .catch(() => {
        setAplicaDescuento(false);
        setPorcentajeDescuento(0);
      });
  }, [adminMode, adminEmail, usuario?.email]);

  const handleSiguiente = () => setPasoConfig([2, 1]);
  const handleVolver = () => {
    setPasoConfig([1, -1]);
    setFaltaDisponibilidad(false); 
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
                onClick={handleSiguiente} 
                disabled={!actividadSeleccionada} 
                className="w-full mt-auto py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
              >
                Siguiente
              </button>
            </motion.div>
          )}

          {paso === 2 && (
            <motion.div key="paso2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col absolute inset-0 overflow-y-auto">
              <button onClick={handleVolver} className="text-sm text-slate-500 mb-4 flex items-center gap-1 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Volver</button>
              
              {/* Ocultamos el cartel de turno sin cupo "base" si ya estamos mostrando el de Prioridad 1 general */}
              {estaLleno && !mostrarPrioridad1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> ¡Turno sin cupos!</p>
                  <p className="text-xs text-amber-700 mb-3">Estás seleccionando un horario completo. ¿Deseas unirte a la lista de espera?</p>
                </div>
              )}

              {precioUnitario > 0 && fechasCalculadas.length > 0 ? (() => {
                const formatear = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const subtotal = precioUnitario * fechasCalculadas.length;
                const descuento = aplicaDescuento ? subtotal * (porcentajeDescuento / 100) : 0;
                const total = subtotal - descuento;
                
                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-auto mb-6 shadow-sm">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal ({fechasCalculadas.length} × ${formatear(precioUnitario)})</span>
                        <span className="font-semibold">${formatear(subtotal)}</span>
                      </div>
                      {aplicaDescuento && (
                        <div className="flex justify-between text-emerald-700">
                          <span className="flex items-center gap-1">
                            <TicketPercent className="w-4 h-4" /> Descuento {porcentajeDescuento}%
                          </span>
                          <span className="font-semibold">-${formatear(descuento)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-800 pt-2 border-t border-slate-200">
                        <span className="font-bold">Total a pagar</span>
                        <span className="font-bold">${formatear(total)}</span>
                      </div>
                      {!aplicaDescuento && (
                        <p className="text-xs text-amber-700 mt-2">
                          No calificás para descuento (tenés ausencias o reprogramaciones).
                        </p>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="mt-auto mb-6" />
              )}

              {adminMode && (
                <div className="mb-3">
                  <label className="text-xs text-slate-600 mb-1 block">Email del paciente</label>
                  <input value={adminEmail} onChange={(e) => setAdminEmail?.(e.target.value)} placeholder="email@ejemplo.com" className="w-full p-2 border rounded-md text-sm mb-3" />
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-700 mb-1 block">Fecha límite de reserva</label>
                <input type="date" disabled value={fechaHasta} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              
              {/* BLOQUE DE PRIORIDAD 1: Aparece inmediatamente si un día de la cadena está lleno */}
              {mostrarPrioridad1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Conflictos de disponibilidad
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Algunos de los días seleccionados ya no tienen cupo disponible. ¿Querés anotarte en la lista de espera de turnos fijos con <strong>Prioridad 1</strong>?
                  </p>
                  <button
                    onClick={() => handleAgregarAListaEspera(1)}
                    className="w-full py-2 bg-amber-500 text-white rounded-lg font-bold text-sm hover:bg-amber-600 transition-colors flex justify-center items-center gap-2"
                  >
                    Ingresar con Prioridad 1
                  </button>
                </div>
              )}

              {/* Si hay lugares disponibles, muestra los botones de reserva normal */}
              {!mostrarPrioridad1 && (
                <button 
                  disabled={cargando}
                  onClick={estaLleno ? () => handleAgregarAListaEspera(2) : ejecutarReservaFija}
                  className={`w-full py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${estaLleno ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                >
                  {cargando ? 'Procesando...' : (
                    estaLleno ? (
                        <><AlertCircle className="w-4 h-4" /> Agregar a la lista de espera</>
                    ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Confirmar reserva</>
                    )
                  )}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}