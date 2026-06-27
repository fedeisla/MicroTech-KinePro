// src/components/BannerEspera.tsx
import { Users, Loader2, Check, X, Bell } from 'lucide-react';

export interface BannerEsperaProps {
  personasAdelante: number;
  estado: 'PENDIENTE' | 'NOTIFICADO' | string; 
  onCancelar: () => void;
  onAceptar?: () => void;
  onRechazar?: () => void;
  cargando: boolean;
}

export const BannerEspera = ({ 
  personasAdelante, 
  estado, 
  onCancelar, 
  onAceptar, 
  onRechazar, 
  cargando 
}: BannerEsperaProps) => {
  

  if (estado === 'NOTIFICADO') {
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm animate-in zoom-in-95">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-full text-teal-600 animate-pulse">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-teal-900">¡Hay un turno disponible para vos!</h4>
            <p className="text-sm text-teal-700">Tenés 12hs para aceptar o rechazar.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRechazar} 
            disabled={cargando} 
            className="text-sm bg-white border border-teal-200 text-teal-600 px-3 py-2 rounded-lg hover:bg-teal-50"
          >
            <X className="w-4 h-4" /> Rechazar
          </button>
          <button 
            onClick={onAceptar} 
            disabled={cargando} 
            className="text-sm bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm flex items-center gap-2"
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900">Tenés un turno en espera</h4>
            <p className="text-sm text-blue-700">
              {personasAdelante > 0 ? `Tenés ${personasAdelante} personas por delante` : "Sos el primero en la lista"}
            </p>
          </div>
        </div>
        <button 
          onClick={onCancelar} 
          disabled={cargando} 
          className="text-sm bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancelar"}
        </button>
      </div>
    );
  }

  // CASO 3: Si el estado es CANCELADO, ASIGNADO, EXPIRADO, etc., el componente se oculta solo.
  return null;
};