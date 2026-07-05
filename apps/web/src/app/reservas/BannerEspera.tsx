import { Users, Loader2, Check, X, Bell, CalendarClock } from 'lucide-react';

export interface BannerEsperaProps {
  personasAdelante: number;
  estado: 'PENDIENTE' | 'NOTIFICADO' | string;
  onCancelar: () => void;
  onAceptar?: () => void;
  onRechazar?: () => void;
  cargando: boolean;
  turnoInfo?: {
    actividad: string;
    fecha: string;
    hora: string;
  };
}

// Funciones de formateo auxiliares
const formatearFecha = (fechaRaw: string) => {
  if (!fechaRaw) return '';
  // Si viene en formato ISO (ej: 2026-07-08T00:00:00Z) o YYYY-MM-DD
  const fechaLimpia = fechaRaw.split('T')[0]; 
  const partes = fechaLimpia.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Devuelve DD/MM/YYYY
  }
  return fechaRaw;
};
const formatearHora = (horaRaw: string) => {
  if (!horaRaw) return '';
  
  if (horaRaw.includes('T')) {
    const tiempo = horaRaw.split('T')[1]; // Nos quedamos con la parte derecha de la 'T' (14:30:00.000Z)
    return tiempo.substring(0, 5); // Ahora sí agarramos '14:30'
  }
  
  
  return horaRaw.substring(0, 5);
};

export const BannerEspera = ({ 
  personasAdelante, 
  estado, 
  onCancelar, 
  onAceptar, 
  onRechazar, 
  cargando,
  turnoInfo 
}: BannerEsperaProps) => {
  
  // CASO 1: Turno disponible para ser aceptado
  if (estado === 'NOTIFICADO') {
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm animate-in zoom-in-95">
        <div className="flex items-start sm:items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-full text-teal-600 animate-pulse shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-teal-900">¡Hay un turno disponible para vos!</h4>
            
            {turnoInfo && (
              <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-teal-800">
                <CalendarClock className="w-4 h-4" />
                <span>
                  {turnoInfo.actividad} - {formatearFecha(turnoInfo.fecha)} a las {formatearHora(turnoInfo.hora)}hs
                </span>
              </div>
            )}
            
            <p className="text-sm text-teal-700 mt-1">Tenés 12hs para aceptar o rechazar.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <button 
            onClick={onRechazar} 
            disabled={cargando} 
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-sm bg-white border border-teal-200 text-teal-600 px-3 py-2 rounded-lg hover:bg-teal-50 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Rechazar
          </button>
          <button 
            onClick={onAceptar} 
            disabled={cargando} 
            className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm disabled:opacity-50"
          >
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Aceptar</>}
          </button>
        </div>
      </div>
    );
  }

  // CASO 2: El paciente está en la cola, esperando que se libere un lugar
  if (estado === 'PENDIENTE') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900">Tenés un turno en espera</h4>
            
            {turnoInfo && (
              <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-blue-800">
                <CalendarClock className="w-4 h-4" />
                <span>
                  {turnoInfo.actividad} - {formatearFecha(turnoInfo.fecha)} a las {formatearHora(turnoInfo.hora)}hs
                </span>
              </div>
            )}

            <p className="text-sm text-blue-700 mt-1">
              {personasAdelante > 0 ? `Tenés ${personasAdelante} personas por delante` : "Sos el primero en la lista"}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancelar} 
          disabled={cargando} 
          className="w-full sm:w-auto flex justify-center text-sm bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors shrink-0 disabled:opacity-50"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar"}
        </button>
      </div>
    );
  }

  // CASO 3: Si el estado es CANCELADO, ASIGNADO, EXPIRADO, etc.
  return null;
};