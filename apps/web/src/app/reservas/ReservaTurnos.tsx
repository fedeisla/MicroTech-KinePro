"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner'; 
import { getDiasDisponiblesDelMes, getHorariosTurnos } from '@/services/turnosService';
import { Actividad, RangoHorarioBackend } from '@/types/turno';
import { CrearReservaInput } from '@/types/reserva';
import { crearReserva, crearReservaFija, crearReservaPresencial, crearReservaFijaPresencial } from '@/services/reservasService';
import { useAuth } from '@/hooks/useAuth';

// Importamos los hijos
import SelectorModalidad from './SelectorModalidad';
import GrillaCalendario from './GrillaCalendario';
import PanelHorarios from './PanelHorarios';
import PanelMensual from './PanelMensual';

export default function ReservaTurnos() {
  
  const [modalidad, setModalidad] = useState<'UNICO' | 'MENSUAL'>('UNICO');
  
  const hoy = new Date();
   
  // Estados del calendario
  const [mesActual, setMesActual] = useState<number>(hoy.getMonth());
  const [anioActual, setAnioActual] = useState<number>(hoy.getFullYear());
  
  // NUEVO: Array de días seleccionados (en vez de uno solo)
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  // El día principal para mandarle a la API a buscar los horarios
  const diaPrincipal = diasSeleccionados.length > 0 ? diasSeleccionados[0] : null;
   
  // Estados de datos del backend
  const [diasConCupo, setDiasConCupo] = useState<number[]>([]);
  const [horariosDelDia, setHorariosDelDia] = useState<RangoHorarioBackend[]>([]);
   
  // Estados de selección
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoHorarioBackend | null>(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);
   
  // Estados de UI (Cargas)
  const [cargandoDias, setCargandoDias] = useState<boolean>(false);
  const [cargandoHorarios, setCargandoHorarios] = useState<boolean>(false);
  // Auth
  const { rol } = useAuth();
  const esAdmin = rol === 'ADMIN' || rol === 'OWNER';

  // Email cuando el admin reserva presencialmente
  const [adminEmail, setAdminEmail] = useState<string>('');

  // Buscamos todos los turnos con capacidad para ponerlos en el calendario
  useEffect(() => {
    const fetchDiasDisponibles = async () => {
      try {
        setCargandoDias(true);
        const diasConLugar = await getDiasDisponiblesDelMes(mesActual + 1, anioActual);
        setDiasConCupo(diasConLugar);
      } catch (error) {
        toast.error('Error al cargar el calendario', {
          description: 'No pudimos conectarnos con el servidor. Por favor, intentá de nuevo en unos minutos.',
          duration: 4000,
        });
        setDiasConCupo([]);
      } finally {
        setCargandoDias(false);
      }
    };

    fetchDiasDisponibles();
    resetSeleccion();
  }, [mesActual, anioActual]);

  // Buscamos del día principal que seleccionó, el horario y las actividades
  useEffect(() => {
    const fetchHorarios = async () => {
      if (!diaPrincipal) return; 
      
      try {
        setCargandoHorarios(true);
        
        const mesFormateado = String(mesActual + 1).padStart(2, '0');
        const diaFormateado = String(diaPrincipal).padStart(2, '0'); 
        const fechaConsulta = `${anioActual}-${mesFormateado}-${diaFormateado}`;

        const turnosAgrupados = await getHorariosTurnos(fechaConsulta);
        setHorariosDelDia(turnosAgrupados);

      } catch (error) {
        setHorariosDelDia([]);
        toast.error('Error al cargar los horarios', {
          description: 'No pudimos obtener las actividades de este día. Intentá nuevamente.',
          duration: 4000,
        });
      } finally {
        setCargandoHorarios(false);
      }
    };

    fetchHorarios();
  }, [diaPrincipal, mesActual, anioActual]); 

  const mesAnterior = () => {
    if (mesActual === 0) {
      setMesActual(11);
      setAnioActual(anioActual - 1);
    } else {
      setMesActual(mesActual - 1);
    }
  };

  const mesSiguiente = () => {
    if (mesActual === 11) {
      setMesActual(0);
      setAnioActual(anioActual + 1);
    } else {
      setMesActual(mesActual + 1);
    }
  };

  const resetSeleccion = () => {
    setDiasSeleccionados([]); 
    setRangoSeleccionado(null);
    setActividadSeleccionada(null);
    setHorariosDelDia([]);
  };

  const handleSeleccionarHorario = (rango: RangoHorarioBackend) => {
    setRangoSeleccionado(rango);
    setActividadSeleccionada(null); 
  };

  const handleConfirmarTurno = async () => {
    if (!diaPrincipal || !actividadSeleccionada || !rangoSeleccionado) return; 
    try {
      const inputReserva: CrearReservaInput = {
        turno_id: actividadSeleccionada.id,
      };

      if (esAdmin) {
        if (!adminEmail) throw new Error('Ingrese el email del paciente');
        await crearReservaPresencial(adminEmail, inputReserva.turno_id);
      } else {
        await crearReserva(inputReserva);
      }
      const mesFormateado = String(mesActual + 1).padStart(2, '0');
      const diaFormateado = String(diaPrincipal).padStart(2, '0'); 

      toast.success('¡Turno reservado con éxito!', {
        description: `${actividadSeleccionada.nombre} el ${diaFormateado}/${mesFormateado} de ${rangoSeleccionado.desde} a ${rangoSeleccionado.hasta} hs.`,
        duration: 4000,
      });
    } catch (error: any) {
      toast.error('No pudimos registrar tu reserva', {
        description: error.message || 'Ocurrió un problema de conexión. Intentá de nuevo.',
        duration: 5000,
      });
    }
  };

  const handleConfirmarReservaFija = async (fechasMensuales: Date[]) => {
    if (!actividadSeleccionada || fechasMensuales.length === 0) return;

    try {
      let respuesta;
      if (esAdmin) {
        if (!adminEmail) throw new Error('Ingrese el email del paciente');
        respuesta = await crearReservaFijaPresencial(adminEmail, actividadSeleccionada.id, fechasMensuales);
      } else {
        respuesta = await crearReservaFija(actividadSeleccionada.id, fechasMensuales);
      }
      toast.success(respuesta.message, { duration: 5000 });
      resetSeleccion();
      setModalidad('UNICO');
    } catch (error: any) {
      toast.error('No pudimos registrar tu reserva fija', {
        description: error.message || 'Ocurrió un problema. Intentá de nuevo.',
      });
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
      
      <SelectorModalidad 
        modalidad={modalidad} 
        onChangeModalidad={(mod) => {
          setModalidad(mod);
          resetSeleccion(); 
        }} 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        
        
        <div className="md:col-span-2 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
          <GrillaCalendario 
            modalidad={modalidad} 
            mesActual={mesActual}
            anioActual={anioActual}
            diasSeleccionados={diasSeleccionados} 
            setDiasSeleccionados={setDiasSeleccionados} 
            diasConCupo={diasConCupo}
            cargandoDias={cargandoDias}
            mesAnterior={mesAnterior}
            mesSiguiente={mesSiguiente}
            setRangoSeleccionado={setRangoSeleccionado}
            setActividadSeleccionada={setActividadSeleccionada}
          />
        </div>

        
        <div className="flex flex-col h-full min-h-[380px]">
          {modalidad === 'UNICO' ? (
             <PanelHorarios 
               diaSeleccionado={diaPrincipal} 
               horariosDelDia={horariosDelDia}
               cargandoHorarios={cargandoHorarios}
               rangoSeleccionado={rangoSeleccionado}
               setRangoSeleccionado={setRangoSeleccionado}
               actividadSeleccionada={actividadSeleccionada}
               setActividadSeleccionada={setActividadSeleccionada}
              handleConfirmarTurno={handleConfirmarTurno}
              adminMode={esAdmin}
              adminEmail={adminEmail}
              setAdminEmail={setAdminEmail}
             />
          ) : (
             <PanelMensual 
                mesActual={mesActual}
                anioActual={anioActual}
                diasSeleccionados={diasSeleccionados} 
                horariosDelDia={horariosDelDia}
                cargandoHorarios={cargandoHorarios}
                rangoSeleccionado={rangoSeleccionado}
                setRangoSeleccionado={setRangoSeleccionado}
                actividadSeleccionada={actividadSeleccionada}
                setActividadSeleccionada={setActividadSeleccionada}
               handleConfirmarReservaFija={handleConfirmarReservaFija}
               adminMode={esAdmin}
               adminEmail={adminEmail}
               setAdminEmail={setAdminEmail}
            />
          )}
        </div>

      </div>
    </div>
  );
}