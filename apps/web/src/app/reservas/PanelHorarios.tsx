import { Clock, Loader2, CalendarDays, ClipboardList, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { RangoHorarioBackend, Actividad } from '@/types/turno';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getActividades } from '@/services/actividadesService';

interface Props {
  diaSeleccionado: number | null;
  horariosDelDia: RangoHorarioBackend[];
  cargandoHorarios: boolean;
  rangoSeleccionado: RangoHorarioBackend | null;
  setRangoSeleccionado: (rango: RangoHorarioBackend | null) => void;
  actividadSeleccionada: Actividad | null;
  setActividadSeleccionada: (act: Actividad | null) => void;
  handleConfirmarTurno: () => void;
  handleAnotarEnEspera: () => void;
  handleNotificarApertura?: () => void;
  adminMode?: boolean;
  adminEmail?: string;
  setAdminEmail?: (email: string) => void;
}

export default function PanelHorarios({
  diaSeleccionado, horariosDelDia, cargandoHorarios, 
  rangoSeleccionado, setRangoSeleccionado, 
  actividadSeleccionada, setActividadSeleccionada, 
  handleConfirmarTurno, handleAnotarEnEspera, handleNotificarApertura,
  adminMode = false, adminEmail = '', setAdminEmail
}: Props) {

  const [actividadesBase, setActividadesBase] = useState<Actividad[]>([]);

  // 1. Volvemos a traer las actividades base para poder armar la grilla falsa de lista de espera
  useEffect(() => {
    const fetchActividades = async () => {
      try {
        const data = await getActividades();
        const actividadesFormateadas: Actividad[] = data.map((act: any) => ({
          id: act.id,
          nombre: act.nombre,
          cuposTotales: 15,
          cuposDisponibles: 0 // Las forzamos a 0 para que salte la lista de espera
        }));
        setActividadesBase(actividadesFormateadas);
      } catch (error) {
        toast.error('Error al cargar las actividades del sistema');
      }
    };
    fetchActividades();
  }, []);

  const handleSeleccionarHorario = (rango: RangoHorarioBackend) => {
    setRangoSeleccionado(rango);
    setActividadSeleccionada(null); 
  };

  const onListaEsperaClick = () => {
    handleAnotarEnEspera();
  };

  // 2. Restauramos la lógica de rellenar el día si no hay turnos cargados
  const generarHorariosCompletosCentro = (): RangoHorarioBackend[] => {
    const horariosTemplate: RangoHorarioBackend[] = [];
    for (let hora = 7; hora < 22; hora++) {
      const desde = `${String(hora).padStart(2, '0')}:00`;
      const hasta = `${String(hora + 1).padStart(2, '0')}:00`;
      horariosTemplate.push({
        idTurno: -hora, // ID negativo para que no choque con los reales
        desde,
        hasta,
        actividades: actividadesBase 
      });
    }
    return horariosTemplate;
  };

  const modoListaEsperaGlobal = diaSeleccionado && horariosDelDia.length === 0;
  const horariosAMostrar = modoListaEsperaGlobal ? generarHorariosCompletosCentro() : horariosDelDia;
  const todoAgotado = rangoSeleccionado ? rangoSeleccionado.actividades.every(act => act.cuposDisponibles === 0) : false;

  return (
    <>
      {/* 1. SECCIÓN DE HORARIOS */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          {diaSeleccionado ? `Horarios del ${diaSeleccionado}` : "Selecciona un día"}
          {cargandoHorarios && <Loader2 className="w-4 h-4 text-teal-600 animate-spin ml-auto" />}
        </h3>

        {!diaSeleccionado ? (
          <div className="text-xs text-slate-400 bg-slate-50/60 rounded-2xl p-6 text-center border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <CalendarDays className="w-6 h-6 text-slate-300 stroke-[1.5]" />
            <span>Elegí una fecha para ver los horarios.</span>
          </div>
        ) : horariosAMostrar.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
            {horariosAMostrar.map((rango, idx) => {
              const esHoraSeleccionada = rangoSeleccionado?.desde === rango.desde;
              const rangoLleno = rango.actividades.every(a => a.cuposDisponibles === 0);
              
              return (
                <button
                  key={`rango-${idx}`}
                  onClick={() => handleSeleccionarHorario(rango)}
                  className={`py-2 px-3 text-center border text-xs rounded-xl font-semibold transition-all flex justify-center items-center gap-1
                    ${esHoraSeleccionada 
                      ? rangoLleno ? 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-500/10' : 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600/10' 
                      : 'border-slate-200 text-slate-600 hover:border-teal-600 hover:text-teal-600 hover:bg-slate-50/50'
                    }
                  `}
                >
                  {rangoLleno && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                  {rango.desde} - {rango.hasta}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* 2. SECCIÓN DE ACTIVIDADES */}
      <div className="flex-1">
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 transition-opacity ${rangoSeleccionado ? 'text-slate-800 opacity-100' : 'text-slate-300 opacity-50'}`}>
          <ClipboardList className="w-5 h-5 text-teal-600" />
          Actividades
        </h3>

        {rangoSeleccionado && (
          <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
            
            {todoAgotado && (
              <div className="mb-2 p-3 bg-yellow-50/80 border border-yellow-200 rounded-xl flex items-start gap-2 text-yellow-900 text-xs animate-in fade-in slide-in-from-top-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                <div className="flex-1">
                  <p className="mb-2">
                    {modoListaEsperaGlobal ? (
                      <><strong>Agenda no abierta.</strong> Elegí la actividad de preferencia para anotarte a la lista de espera y te avisamos cuando se abran los turnos.</>
                    ) : (
                      <><strong>Turnos agotados.</strong> Elija la actividad de preferencia para anotarse a la lista de espera.</>
                    )}
                  </p>
                </div>
              </div>
            )}

            {rangoSeleccionado.actividades.map((act) => {
              const sinCupo = act.cuposDisponibles === 0;
              const esActividadSeleccionada = actividadSeleccionada?.id === act.id;

              let buttonStyle = 'border-slate-200 text-slate-700 hover:border-teal-400 hover:shadow-sm';
              if (esActividadSeleccionada) {
                buttonStyle = sinCupo ? 'border-yellow-500 bg-yellow-50 text-yellow-800 ring-1 ring-yellow-500/20' : 'border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600/20';
              } else if (sinCupo) {
                buttonStyle = 'bg-slate-50 border-slate-200 text-slate-500 hover:border-yellow-400 hover:bg-yellow-50/50';
              }

              return (
                <button
                  key={`act-${act.id}`}
                  onClick={() => setActividadSeleccionada(act)}
                  className={`text-left p-3 border rounded-xl text-sm transition-all flex justify-between items-center ${buttonStyle}`}
                >
                  <span className="font-semibold">{act.nombre}</span>
                  <span className={`text-xs px-2 py-1 rounded-md font-bold ${sinCupo ? 'bg-yellow-100 text-yellow-700' : 'bg-teal-100 text-teal-700'}`}>
                    {sinCupo ? 'Agotado - Espera' : `${act.cuposDisponibles} cupos`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SECCIÓN DE CONFIRMACIÓN / LISTA DE ESPERA */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        {!diaSeleccionado || !rangoSeleccionado || !actividadSeleccionada ? (
          <button disabled className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Seleccione un turno</span>
          </button>
        ) : actividadSeleccionada.cuposDisponibles === 0 ? (
          <button
            onClick={onListaEsperaClick}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer active:scale-[0.98] shadow-sm transition-all flex items-center justify-center gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4" />
            <span>Agregar a la lista de espera</span>
          </button>
        ) : (
          <button
            onClick={handleConfirmarTurno}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 text-white hover:bg-teal-700 cursor-pointer active:scale-[0.98] shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Reserva</span>
          </button>
        )}
      </div>
    </>
  );
}