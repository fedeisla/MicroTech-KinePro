import { toast } from 'sonner';

interface BotonAccionTurnoProps {
  cuposDisponibles: number;
  onConfirmarReserva: () => void;
  onAnotarEnEspera: () => void; // Acá le pasarías la función que le pega a tu API de NestJS
}

export const BotonAccionTurno = ({
  cuposDisponibles,
  onConfirmarReserva,
  onAnotarEnEspera,
}: BotonAccionTurnoProps) => {
  const isLleno = cuposDisponibles === 0;

  const handleListaEspera = () => {
    // Usamos el confirm nativo del navegador para la pregunta rápida
    const quiereAnotarse = window.confirm(
      'El turno está lleno. ¿Querés agregarte a la lista de espera?'
    );

    if (quiereAnotarse) {
      onAnotarEnEspera();
    }
  };

  // Si no hay cupos, renderizamos el botón de Lista de Espera
  if (isLleno) {
    return (
      <button
        onClick={handleListaEspera}
        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        Unirse a la lista de espera
      </button>
    );
  }

  // Si hay cupos, renderizamos el botón original que tenés en el diseño
  return (
    <button
      onClick={onConfirmarReserva}
      className="w-full bg-[#0d9488] hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      Confirmar Reserva
    </button>
  );
};