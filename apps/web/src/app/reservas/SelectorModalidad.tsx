import { Calendar, Repeat } from 'lucide-react';

interface Props {
  modalidad: 'UNICO' | 'MENSUAL';
  onChangeModalidad: (mod: 'UNICO' | 'MENSUAL') => void;
}

export default function SelectorModalidad({ modalidad, onChangeModalidad }: Props) {
  return (
    <div className="flex p-1 bg-slate-100 rounded-xl w-fit mx-auto md:mx-0">
      <button
        onClick={() => onChangeModalidad('UNICO')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all
          ${modalidad === 'UNICO' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Calendar className="w-4 h-4" />
        Turno único
      </button>
      
      <button
        onClick={() => onChangeModalidad('MENSUAL')}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all
          ${modalidad === 'MENSUAL' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <Repeat className="w-4 h-4" />
        Reserva mensual
      </button>
    </div>
  );
}