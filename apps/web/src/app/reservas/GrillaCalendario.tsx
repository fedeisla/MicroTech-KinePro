import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';

interface Props {
  modalidad: 'UNICO' | 'MENSUAL'; 
  mesActual: number;
  anioActual: number;
  diasSeleccionados: number[]; 
  setDiasSeleccionados: (dias: number[]) => void; 
  diasConCupo: number[];
  // NUEVO: Agregamos el array de días que están llenos pero existen en la BD
  diasLlenos?: number[]; 
  cargandoDias: boolean;
  mesAnterior: () => void;
  mesSiguiente: () => void;
  setRangoSeleccionado: (rango: any) => void;
  setActividadSeleccionada: (act: any) => void;
}

export default function GrillaCalendario({
  modalidad, mesActual, anioActual, diasSeleccionados, setDiasSeleccionados, 
  diasConCupo, diasLlenos = [], cargandoDias, mesAnterior, mesSiguiente, // <-- Recibimos diasLlenos por default vacío
  setRangoSeleccionado, setActividadSeleccionada
}: Props) {
  
  const hoy = new Date();
  const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie"];

  const primerDiaDelMes = new Date(anioActual, mesActual, 1).getDay(); 
  const totalDiasEnMes = new Date(anioActual, mesActual + 1, 0).getDate();
  
  const diasArr = Array.from({ length: totalDiasEnMes }, (_, i) => i + 1).filter((dia) => {
    const fechaDia = new Date(anioActual, mesActual, dia);
    const dayOfWeek = fechaDia.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  });

  const cantidadVacios = (primerDiaDelMes === 0 || primerDiaDelMes === 6) ? 0 : primerDiaDelMes - 1;
  const espaciosVacios = Array.from({ length: cantidadVacios }, (_, i) => i);

  return (
    <div className="w-full max-w-md mx-auto p-2 bg-white rounded-2xl">
      
      {/* CABECERA DEL MES (Sin cambios) */}
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal-600" />
          {nombresMeses[mesActual]} {anioActual}
          {cargandoDias && <Loader2 className="w-3.5 h-3.5 text-teal-600 animate-spin ml-1" />}
        </h3>
        <div className="flex gap-1">
          <button onClick={mesAnterior} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={mesSiguiente} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-5 gap-3 text-center text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
        {diasSemana.map(d => (
          <div key={d} className="w-full py-1 text-center">{d}</div>
        ))}
      </div>

      <div className="w-full grid grid-cols-5 gap-3">
        {espaciosVacios.map(e => (
          <div key={`vacio-${e}`} className="w-full aspect-square pointer-events-none"></div>
        ))}
        
        {diasArr.map((dia) => {
          const esHoy = hoy.getDate() === dia && hoy.getMonth() === mesActual && hoy.getFullYear() === anioActual;
          const esSeleccionado = diasSeleccionados.includes(dia);
          const tieneCupo = diasConCupo.includes(dia); 
          const estaLleno = diasLlenos.includes(dia); // Verificamos si está lleno

          // Lógica: Si no tiene cupo y tampoco está lleno, significa que directamente NO hay turnos cargados en la base de datos
          const diaSinTurnosCargados = !tieneCupo && !estaLleno;

          let estilosBoton = 'border-transparent text-slate-700 hover:bg-teal-50 hover:text-teal-700 cursor-pointer';
          
          if (esSeleccionado) {
            estilosBoton = tieneCupo 
              ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10 scale-[1.02]' 
              : 'bg-yellow-500 text-white border-yellow-500 shadow-md shadow-yellow-500/10 scale-[1.02]';
          } else if (diaSinTurnosCargados) {
            // BLOQUEADO: Gris, sin cursor, no se puede clickear
            estilosBoton = 'border-slate-100 text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-50';
          } else if (estaLleno) {
            // LISTA DE ESPERA: Naranja clarito, se puede clickear
            estilosBoton = 'border-orange-200 bg-orange-50/50 text-orange-700 hover:bg-orange-100 cursor-pointer';
          } else if (esHoy) {
            estilosBoton = 'border-teal-500 bg-teal-50/30 text-teal-600';
          }

          return (
            <button
              key={`dia-${dia}`}
              // ACÁ BLOQUEAMOS SOLO SI ESTÁ CARGANDO O SI EL DÍA NO EXISTE EN LA BASE DE DATOS
              disabled={cargandoDias || diaSinTurnosCargados} 
              onClick={() => {
                setDiasSeleccionados([dia]);
                setRangoSeleccionado(null);
                setActividadSeleccionada(null);
              }}
              className={`w-full p-2 rounded-xl text-sm font-semibold transition-all flex flex-col items-center justify-center border aspect-square ${estilosBoton}`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}