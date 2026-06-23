"use client";

import React, { useState, useEffect, useRef } from 'react';
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
import { crearPreferenceMP, verificarPagoMP, cancelarPagoMP } from '@/services/pagosService';

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

  // Estados para el proceso de reserva
  const [esperandoPago, setEsperandoPago] = useState(false);
  const [pagoConfirmado, setPagoConfirmado] = useState(false);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reservaIdEsperaRef = useRef<number | null>(null);

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

    const inputReserva: CrearReservaInput = {
      turno_id: actividadSeleccionada.id,
    };

    // Flujo admin: reserva presencial, sin pago MP
    if (esAdmin) {
      try {
        if (!adminEmail) throw new Error('Ingrese el email del paciente');
        await crearReservaPresencial(adminEmail, inputReserva.turno_id);

        const mesFormateado = String(mesActual + 1).padStart(2, '0');
        const diaFormateado = String(diaPrincipal).padStart(2, '0');
        toast.success('¡Turno reservado con éxito!', {
          description: `${actividadSeleccionada.nombre} el ${diaFormateado}/${mesFormateado} de ${rangoSeleccionado.desde} a ${rangoSeleccionado.hasta} hs.`,
          duration: 4000,
        });
      } catch (error: any) {
        toast.error(error.message || 'No se pudo crear la reserva', { duration: 5000 });
      }
      return;
    }

    // Flujo paciente: 2 fases con catches separados

    // FASE 1: crear reserva
    let resReserva;
    try {
      toast.info('Procesando reserva…', { duration: 2000 });
      resReserva = await crearReserva(inputReserva);
    } catch (reservaError: any) {
      toast.error(reservaError.message || 'No se pudo crear la reserva', { duration: 5000 });
      return;
    }

    // FASE 2: crear preference MP
    let pref;
    try {
      pref = await crearPreferenceMP(resReserva.reservaId);
    } catch (mpError) {
      // MP falló: cancelar la reserva pendiente para liberar el cupo
      await cancelarPagoMP(resReserva.reservaId).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

    if (!pref.init_point) {
      await cancelarPagoMP(resReserva.reservaId).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

    // FASE 3: abrir MP y arrancar polling
    const mpWindow = window.open(pref.init_point, '_blank');
    if (!mpWindow) {
      await cancelarPagoMP(resReserva.reservaId).catch(() => {});
      toast.error('El navegador bloqueó la ventana. Habilitá pop-ups y reintentá.', { duration: 5000 });
      return;
    }

    setEsperandoPago(true);
    setPagoConfirmado(false);
    reservaIdEsperaRef.current = resReserva.reservaId;

    intervaloRef.current = setInterval(async () => {
      try {
        const r = await verificarPagoMP(resReserva.reservaId);
        if (r.status === 'ok') {
          console.log('LLEGÓ EL OK - cerrando modal');
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setEsperandoPago(false); //poner en true para ver el modal de pago confirmado
          toast.success('¡Pago confirmado por MercadoPago!');
        } else if (r.status === 'cancelado') {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setEsperandoPago(false);
          toast.error('La reserva fue cancelada');
        } else if (r.status === 'rechazado') {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setEsperandoPago(false);
          toast.error('El pago fue rechazado por MercadoPago');
        }
      } catch (e) {
        // silencioso, el polling sigue
      }
    }, 3000);

    timeoutRef.current = setTimeout(async () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (!pagoConfirmado) {
        // Liberar la reserva pendiente que nunca se pagó
        await cancelarPagoMP(resReserva.reservaId).catch(() => {});
        reservaIdEsperaRef.current = null;
        setEsperandoPago(false);
        toast.error('Tiempo agotado para realizar el pago. La reserva fue cancelada.', { duration: 5000 });
      }
    }, 5 * 60 * 1000);
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

  const handleCancelarPago = async () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (reservaIdEsperaRef.current) {
      try {
        await cancelarPagoMP(reservaIdEsperaRef.current);
        toast.info('Reserva cancelada.');
      } catch (e) {
        // silencioso
      }
      reservaIdEsperaRef.current = null;
    }
    setEsperandoPago(false);
    setPagoConfirmado(false);
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
          {esperandoPago && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                <div className="mx-auto mb-4 w-12 h-12 border-4 border-kine-blue border-t-transparent rounded-full animate-spin" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Esperando confirmación del pago…</h2>
                <p className="text-slate-600 mb-4">
                  Completá el pago en la pestaña de MercadoPago que se abrió.
                </p>
                <p className="text-xs text-slate-400">No cierres esta ventana, vamos a confirmar tu reserva automáticamente.</p>
                <button
                  onClick={handleCancelarPago}
                  className="mt-6 text-sm text-red-600 hover:underline"
                >
                  Cancelar pago
                </button>
              </div>
            </div>
          )}
    </div>
  );
}