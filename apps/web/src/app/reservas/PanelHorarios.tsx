import { Clock, Loader2, CalendarDays, ClipboardList, CheckCircle2 } from 'lucide-react';
import { RangoHorarioBackend, Actividad } from '@/types/turno';
import { useState } from 'react';
import { toast } from 'sonner';
import { crearPaciente } from '@/services/usuariosService';

interface Props {
  diaSeleccionado: number | null;
  horariosDelDia: RangoHorarioBackend[];
  cargandoHorarios: boolean;
  rangoSeleccionado: RangoHorarioBackend | null;
  setRangoSeleccionado: (rango: RangoHorarioBackend | null) => void;
  actividadSeleccionada: Actividad | null;
  setActividadSeleccionada: (act: Actividad | null) => void;
  handleConfirmarTurno: () => void;
  adminMode?: boolean;
  adminEmail?: string;
  setAdminEmail?: (email: string) => void;
}

export default function PanelHorarios({
  diaSeleccionado, horariosDelDia, cargandoHorarios, 
  rangoSeleccionado, setRangoSeleccionado, 
  actividadSeleccionada, setActividadSeleccionada, handleConfirmarTurno
  , adminMode = false, adminEmail = '', setAdminEmail
}: Props) {

  const [showRegistro, setShowRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [password, setPassword] = useState('12345678');

  const handleRegistrarPaciente = async () => {
    try {
      if (!adminEmail) return toast.error('Ingrese un email antes de registrar');
      await crearPaciente({ nombre, apellido, dni, telefono, email: adminEmail, password, fechaNacimiento });
      toast.success('Paciente registrado con éxito');
      setShowRegistro(false);
      setNombre(''); setApellido(''); setDni(''); setTelefono(''); setFechaNacimiento('');
    } catch (err: any) {
      toast.error('No se pudo registrar al paciente', { description: err.message || String(err) });
    }
  };

  const handleSeleccionarHorario = (rango: RangoHorarioBackend) => {
    setRangoSeleccionado(rango);
    setActividadSeleccionada(null); 
  };

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
        ) : horariosDelDia.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {horariosDelDia.map((rango, idx) => {
              const esHoraSeleccionada = rangoSeleccionado?.desde === rango.desde;
              return (
                <button
                  key={`rango-${idx}`}
                  onClick={() => handleSeleccionarHorario(rango)}
                  className={`py-2 px-3 text-center border text-xs rounded-xl font-semibold transition-all
                    ${esHoraSeleccionada 
                      ? 'border-teal-600 bg-teal-50 text-teal-700 ring-2 ring-teal-600/10' 
                      : 'border-slate-200 text-slate-600 hover:border-teal-600 hover:text-teal-600 hover:bg-slate-50/50'
                    }
                  `}
                >
                  {rango.desde} - {rango.hasta}
                </button>
              );
            })}
          </div>
        ) : !cargandoHorarios ? (
           <div className="text-xs text-slate-500 text-center py-4">No hay horarios disponibles este día.</div>
        ) : null}
      </div>

      {/* 2. SECCIÓN DE ACTIVIDADES */}
      <div className="flex-1">
         <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 transition-opacity ${rangoSeleccionado ? 'text-slate-800 opacity-100' : 'text-slate-300 opacity-50'}`}>
            <ClipboardList className="w-5 h-5 text-teal-600" />
            Actividades
         </h3>

         {rangoSeleccionado && (
            <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
              {rangoSeleccionado.actividades.map((act) => {
                const sinCupo = act.cuposDisponibles === 0;
                const esActividadSeleccionada = actividadSeleccionada?.id === act.id;

                return (
                  <button
                    key={`act-${act.id}`}
                    disabled={sinCupo}
                    onClick={() => setActividadSeleccionada(act)}
                    className={`text-left p-3 border rounded-xl text-sm transition-all flex justify-between items-center
                      ${sinCupo 
                        ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' 
                        : esActividadSeleccionada
                          ? 'border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600/20'
                          : 'border-slate-200 text-slate-700 hover:border-teal-400 hover:shadow-sm'
                      }
                    `}
                  >
                    <span className="font-semibold">{act.nombre}</span>
                    <span className={`text-xs px-2 py-1 rounded-md font-bold ${sinCupo ? 'bg-slate-200 text-slate-500' : 'bg-teal-100 text-teal-700'}`}>
                      {sinCupo ? 'Agotado' : `${act.cuposDisponibles} cupos`}
                    </span>
                  </button>
                )
              })}
            </div>
         )}
      </div>

      {/* 3. BOTÓN DE CONFIRMACIÓN */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        {adminMode && (
          <div className="mb-3">
            <label className="text-xs text-slate-600 mb-1 block">Email del paciente</label>
            <input value={adminEmail} onChange={(e) => setAdminEmail?.(e.target.value)} placeholder="email@ejemplo.com" className="w-full p-2 border rounded-md text-sm" />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => setShowRegistro(s => !s)} className="px-3 py-1 rounded-md text-sm bg-slate-100 hover:bg-slate-200">{showRegistro ? 'Cancelar registro' : 'Registrar paciente'}</button>
            </div>
            {showRegistro && (
              <div className="mt-3 bg-white border p-3 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="p-2 border rounded-md text-sm" />
                  <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} className="p-2 border rounded-md text-sm" />
                  <input placeholder="DNI" value={dni} onChange={(e) => setDni(e.target.value)} className="p-2 border rounded-md text-sm" />
                  <input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="p-2 border rounded-md text-sm" />
                  <input placeholder="Fecha nacimiento (YYYY-MM-DD)" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className="p-2 border rounded-md text-sm col-span-2" />
                  <input placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="p-2 border rounded-md text-sm col-span-2" />
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={handleRegistrarPaciente} className="px-4 py-2 rounded-md bg-teal-600 text-white">Registrar</button>
                </div>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleConfirmarTurno}
          disabled={!diaSeleccionado || !rangoSeleccionado || !actividadSeleccionada}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2
            ${diaSeleccionado && rangoSeleccionado && actividadSeleccionada
              ? 'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }
          `}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirmar Reserva</span>
        </button>
      </div>
    </>
  );
}