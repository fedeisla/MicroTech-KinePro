"use client";

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner'; 
import { getDiasDisponiblesDelMes, getHorariosTurnos } from '@/services/turnosService';
import { Actividad, RangoHorarioBackend } from '@/types/turno';
import { CrearReservaInput } from '@/types/reserva';
import { crearReserva, crearReservaFija, crearReservaPresencial, crearReservaFijaPresencial } from '@/services/reservasService';
import { useAuth } from '@/hooks/useAuth';
import { BannerEspera } from './BannerEspera'; 

// Importamos los hijos
import SelectorModalidad from './SelectorModalidad';
import GrillaCalendario from './GrillaCalendario';
import PanelHorarios from './PanelHorarios';
import PanelMensual from './PanelMensual';
import {
  crearPreferenceMP,
  verificarPagoMP,
  cancelarPagoMP,
  crearPreferenceMPFijo,
  verificarPagoMPFijo,
  cancelarPagoMPFijo,
} from '@/services/pagosService';
import { listaEsperaService } from '@/services/listaEsperaService';

export default function ReservaTurnos() {
  
  const [modalidad, setModalidad] = useState<'UNICO' | 'MENSUAL'>('UNICO');
  const hoy = new Date();

  const [solicitudEspera, setSolicitudEspera] = useState<any>(null);
  const [cargandoCancelacion, setCargandoCancelacion] = useState(false);

  // Estados del calendario
  const [mesActual, setMesActual] = useState<number>(hoy.getMonth());
  const [anioActual, setAnioActual] = useState<number>(hoy.getFullYear());
  
  // Array de días seleccionados
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const diaPrincipal = diasSeleccionados.length > 0 ? diasSeleccionados[0] : null;
   
  // Estados de datos del backend
  const [diasConCupo, setDiasConCupo] = useState<number[]>([]);
  const [diasLlenos, setDiasLlenos] = useState<number[]>([]);
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
  const reservaIdsGrupoEsperaRef = useRef<number[] | null>(null);
  const grupoIdEsperaRef = useRef<number | null>(null);

  const [faltaDisponibilidad, setFaltaDisponibilidad] = useState(false);

  const handleCancelarEspera = async () => {
    if (!solicitudEspera) return;
    setCargandoCancelacion(true);
    try {
      await listaEsperaService.cancelar(solicitudEspera.id);
      setSolicitudEspera(null);
      toast.info('Solicitud de espera cancelada');
    } catch (error) {
      toast.error('No se pudo cancelar la solicitud');
    } finally {
      setCargandoCancelacion(false);
    }
  };

 const handleResponderNotificacion = async (acepta: boolean) => {
    if (!solicitudEspera) return;
    setCargandoCancelacion(true);

    try {
      if (!acepta) {
        await listaEsperaService.responderNotificacion(
          solicitudEspera.id, 
          false, 
          solicitudEspera.turnoId
        );
        toast.info('Rechazaste el turno');
        setSolicitudEspera(null);
        return;
      }

      toast.info('Procesando confirmación...', { duration: 2000 });

      const resReserva = await listaEsperaService.responderNotificacion(
        solicitudEspera.id, 
        true, 
        solicitudEspera.turnoId
      );

      // 1. Detectamos si es un turno fijo evaluando si el backend devolvió un arreglo de reservaIds
      const esFijo = Array.isArray(resReserva.reservaIds) && resReserva.reservaIds.length > 0;

      if (!resReserva || (!resReserva.reservaId && !esFijo)) {
        throw new Error('El servidor no devolvió el ID de la reserva para generar el pago.');
      }
      
      if (resReserva.montoTotal !== undefined) {
        const formatear = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        let msgPago = `Total a abonar en Mercado Pago: $${formatear(resReserva.montoTotal)}.`;
        
        if (resReserva.aplicaDescuento) {
          msgPago += ` (Incluye ${resReserva.porcentajeAplicado}% de descuento por buena asistencia )`;
        }
        
        toast.success(resReserva.message); 
        toast.info(msgPago, { duration: 5000 });
      } else {
        toast.info('Abriendo Mercado Pago...', { duration: 2000 });
      }

      // 2. Generamos la preferencia de pago según el tipo de reserva
      let pref;
      try {
        if (esFijo) {
          pref = await crearPreferenceMPFijo(resReserva.reservaIds!); // Agregamos "!"
        } else {
          pref = await crearPreferenceMP(resReserva.reservaId!); // Agregamos "!"
        }
      } catch (mpError) {
        if (esFijo) await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {}); // Agregamos "!"
        else await cancelarPagoMP(resReserva.reservaId!).catch(() => {}); // Agregamos "!"
        
        toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
        return;
      }

      if (!pref.init_point) {
        if (esFijo) await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {}); // Agregamos "!"
        else await cancelarPagoMP(resReserva.reservaId!).catch(() => {}); // Agregamos "!"
        
        toast.error('No se pudo generar el link de pago.', { duration: 5000 });
        return;
      }

     const mpWindow = window.open(pref.init_point, '_blank');
      if (!mpWindow) {
        if (esFijo) await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {});
        else await cancelarPagoMP(resReserva.reservaId!).catch(() => {});
        
        toast.error('El navegador bloqueó la ventana. Habilitá pop-ups y reintentá.', { duration: 5000 });
        return;
      }

      setEsperandoPago(true);
      setPagoConfirmado(false);
      
      // 3. Guardamos los IDs correspondientes en las Refs para poder cancelarlos o verificarlos
      if (esFijo) {
        reservaIdsGrupoEsperaRef.current = resReserva.reservaIds!;
        grupoIdEsperaRef.current = (pref as any).grupoId; // Forzamos el tipo con "any" para evitar el error
      } else {
        reservaIdEsperaRef.current = resReserva.reservaId!;
      }

      intervaloRef.current = setInterval(async () => {
        try {
          // 4. Verificamos el pago con el endpoint correspondiente
          let r;
          if (esFijo) {
            r = await verificarPagoMPFijo((pref as any).grupoId); // Forzamos el tipo acá también
          } else {
            r = await verificarPagoMP(resReserva.reservaId!);
          }

          if (r.status === 'ok') {
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            setEsperandoPago(false); 
            setSolicitudEspera(null); 
            
            // Limpiar refs
            reservaIdsGrupoEsperaRef.current = null;
            grupoIdEsperaRef.current = null;
            reservaIdEsperaRef.current = null;
            
            toast.success('¡Pago confirmado por MercadoPago! Tu turno está reservado.');
          } else if (r.status === 'cancelado') {
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setEsperandoPago(false);
            toast.error('La reserva fue cancelada.');
          } else if (r.status === 'rechazado') {
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setEsperandoPago(false);
            toast.error('El pago fue rechazado por MercadoPago.');
          }
        } catch (e) {
          // Silencioso para que el polling siga intentando
        }
      }, 3000);

      timeoutRef.current = setTimeout(async () => {
        if (intervaloRef.current) clearInterval(intervaloRef.current);
        if (!pagoConfirmado) {
          // 5. Cancelación por timeout adaptada
          if (esFijo) {
            await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {});
            reservaIdsGrupoEsperaRef.current = null;
            grupoIdEsperaRef.current = null;
          } else {
            if (resReserva?.reservaId) {
              await cancelarPagoMP(resReserva.reservaId!).catch(() => {});
            }
            reservaIdEsperaRef.current = null;
          }
          
          setEsperandoPago(false);
          toast.error('Tiempo agotado para pagar. La oportunidad fue cancelada y pasará al siguiente en la lista.', { duration: 5000 });
        }
      }, 5 * 60 * 1000);

    } catch (error: any) {
      toast.error(error.message || 'Error al procesar tu respuesta');
    } finally {
      setCargandoCancelacion(false);
    }
  };

  useEffect(() => {
    const fetchDiasDisponibles = async () => {
      try {
        setCargandoDias(true);
        // Ahora getDiasDisponiblesDelMes devuelve el objeto { diasConCupo, diasLlenos }
        const respuesta = await getDiasDisponiblesDelMes(mesActual + 1, anioActual);
        
        setDiasConCupo(respuesta.diasConCupo);
        setDiasLlenos(respuesta.diasLlenos);
      } catch (error) {
        toast.error('Error al cargar el calendario', {
          description: 'No pudimos conectarnos con el servidor. Por favor, intentá de nuevo en unos minutos.',
          duration: 4000,
        });
        setDiasConCupo([]);
        setDiasLlenos([]); // Limpiamos los dos por si falla
      } finally {
        setCargandoDias(false);
      }
    };

    fetchDiasDisponibles();
    resetSeleccion();
  }, [mesActual, anioActual]);

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

  useEffect(() => {
    const cargarEstadoEspera = async () => {
      try {
        const estado = await listaEsperaService.getMiEstado();
        setSolicitudEspera(estado);
      } catch (e) {
        console.log("No hay solicitud de espera activa");
        setSolicitudEspera(null);
      }
    };

    cargarEstadoEspera();
  }, []);

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

  const handleConfirmarTurno = async () => {
    if (!diaPrincipal || !actividadSeleccionada || !rangoSeleccionado) return;

    const inputReserva: CrearReservaInput = {
      turno_id: actividadSeleccionada.id,
    };

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

    let resReserva;
    try {
      toast.info('Procesando reserva…', { duration: 2000 });
      resReserva = await crearReserva(inputReserva);
    } catch (reservaError: any) {
      toast.error(reservaError.message || 'No se pudo crear la reserva', { duration: 5000 });
     
      return;
    }

    let pref;
    try {
      pref = await crearPreferenceMP(resReserva.reservaId);
    } catch (mpError) {
      await cancelarPagoMP(resReserva.reservaId).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

    if (!pref.init_point) {
      await cancelarPagoMP(resReserva.reservaId).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

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
          setEsperandoPago(false); 
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
        // silencioso
      }
    }, 3000);

    timeoutRef.current = setTimeout(async () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (!pagoConfirmado) {
        await cancelarPagoMP(resReserva.reservaId).catch(() => {});
        reservaIdEsperaRef.current = null;
        setEsperandoPago(false);
        toast.error('Tiempo agotado para realizar el pago. La reserva fue cancelada.', { duration: 5000 });
      }
    }, 12 * 60 * 60 * 1000); // 12 horas ajustadas en el backend
  };

  const handleConfirmarReservaFija = async (fechasMensuales: Date[]) => {
    if (!actividadSeleccionada || fechasMensuales.length === 0) return;

    // ─── Rama ADMIN (presencial) — sin cambios ──────────────────────────
    if (esAdmin) {
      try {
        if (!adminEmail) throw new Error('Ingrese el email del paciente');
        const respuesta = await crearReservaFijaPresencial(adminEmail, actividadSeleccionada.id, fechasMensuales);
        toast.success(respuesta.message, { duration: 5000 });
        resetSeleccion();
        setModalidad('UNICO');
      } catch (error: any) {
        toast.error('No pudimos registrar tu reserva fija', {
          description: error.message || 'Ocurrió un problema. Intentá de nuevo.',
        });
      }
      return;
    }

    // ─── Rama PACIENTE (con MercadoPago) ────────────────────────────────

    // FASE 1: crear las reservas en estado PENDIENTE
    let respuesta;
    try {
      toast.info('Procesando reserva…', { duration: 2000 });
      respuesta = await crearReservaFija(actividadSeleccionada.id, fechasMensuales);
    } catch (reservaError: any) {
      toast.error(reservaError.message || 'No se pudo crear la reserva', { duration: 5000 });
      return;
    }

    const reservaIds: number[] = respuesta.reservaIds ?? [];
    if (reservaIds.length === 0) {
      toast.error('No se pudieron identificar las reservas creadas');
      return;
    }

    // FASE 2: crear la preference MP del grupo
    let pref;
    try {
      pref = await crearPreferenceMPFijo(reservaIds);
    } catch (mpError) {
      await cancelarPagoMPFijo(reservaIds).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

    if (!pref.init_point) {
      await cancelarPagoMPFijo(reservaIds).catch(() => {});
      toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
      return;
    }

    // FASE 3: abrir MP y arrancar polling
    const mpWindow = window.open(pref.init_point, '_blank');
    if (!mpWindow) {
      await cancelarPagoMPFijo(reservaIds).catch(() => {});
      toast.error('El navegador bloqueó la ventana. Habilitá pop-ups y reintentá.', { duration: 5000 });
      return;
    }

    setEsperandoPago(true);
    setPagoConfirmado(false);
    reservaIdsGrupoEsperaRef.current = reservaIds;
    grupoIdEsperaRef.current = pref.grupoId;

    intervaloRef.current = setInterval(async () => {
      try {
        const r = await verificarPagoMPFijo(pref.grupoId);
        if (r.status === 'ok') {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          reservaIdsGrupoEsperaRef.current = null;
          grupoIdEsperaRef.current = null;
          setEsperandoPago(false);
          toast.success('¡Pago confirmado por MercadoPago!');
          resetSeleccion();
          setModalidad('UNICO');
        } else if (r.status === 'cancelado') {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          reservaIdsGrupoEsperaRef.current = null;
          grupoIdEsperaRef.current = null;
          setEsperandoPago(false);
          toast.error('La reserva fue cancelada');
        } else if (r.status === 'rechazado') {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          reservaIdsGrupoEsperaRef.current = null;
          grupoIdEsperaRef.current = null;
          setEsperandoPago(false);
          toast.error('El pago fue rechazado por MercadoPago');
        }
      } catch (e) {
        // silencioso
      }
    }, 3000);

    timeoutRef.current = setTimeout(async () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (!pagoConfirmado) {
        await cancelarPagoMPFijo(reservaIds).catch(() => {});
        reservaIdsGrupoEsperaRef.current = null;
        grupoIdEsperaRef.current = null;
        setEsperandoPago(false);
        toast.error('Tiempo agotado para realizar el pago. La reserva fue cancelada.', { duration: 5000 });
      }
    }, 5 * 60 * 1000);
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
    if (reservaIdsGrupoEsperaRef.current) {
      try {
        await cancelarPagoMPFijo(reservaIdsGrupoEsperaRef.current);
        toast.info('Reservas canceladas.');
      } catch (e) {
        // silencioso
      }
      reservaIdsGrupoEsperaRef.current = null;
      grupoIdEsperaRef.current = null;
    }
    setEsperandoPago(false);
    setPagoConfirmado(false);
  };

  const handleAnotarEnEspera = async () => {
    if (!diaPrincipal || !actividadSeleccionada || !rangoSeleccionado) return;
    try {
        await listaEsperaService.inscribir({
          turnoId: actividadSeleccionada!.id,
          prioridad: 2
        });
        toast.success('¡Te anotaste correctamente!');
      } catch (error: any) {
        toast.error(error.message || 'Error al procesar la solicitud');
      }
  };

  const handleNotificarApertura = async () => {
    if (!diaPrincipal) return;
    try {
      console.log(`Guardando alerta de apertura para el día ${diaPrincipal}`);
    } catch (error) {
      toast.error('Error al configurar la alerta');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-2xl border border-slate-100 shadow-md">
      
      {/* Banner de Lista de Espera */}
      {solicitudEspera && (
        <div className="mb-6">
          <BannerEspera 
            estado={solicitudEspera.estado} 
            personasAdelante={solicitudEspera.personasAdelante}
            // Mapeamos los datos del turno que vienen de la API
            turnoInfo={{
              actividad: solicitudEspera.turno?.tipoActividad?.nombre || 'Turno', 
              fecha: solicitudEspera.turno?.fecha, 
              hora: solicitudEspera.turno?.hora_inicio
            }}
            onCancelar={handleCancelarEspera}
            onAceptar={() => handleResponderNotificacion(true)}
            onRechazar={() => handleResponderNotificacion(false)}
            cargando={cargandoCancelacion}
          />
        </div>
      )}
        
      {/* Selector de Modalidad */}
      <div className="mb-2">
        <SelectorModalidad 
          modalidad={modalidad} 
          onChangeModalidad={(mod) => {
            setModalidad(mod);
            resetSeleccion(); 
          }} 
        />
      </div>

      {/* DISEÑO REFRACTORIZADO: Grilla equilibrada 7 a 5 para simetría total */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
        
        {/* COLUMNA IZQUIERDA: Calendario (Ocupa 7/12 del espacio) */}
        <div className="lg:col-span-7 bg-slate-50/40 rounded-2xl p-5 border border-slate-100 flex items-center justify-center w-full">
          <div className="w-full flex justify-center">
            <GrillaCalendario 
              modalidad={modalidad} 
              mesActual={mesActual}
              anioActual={anioActual}
              diasSeleccionados={diasSeleccionados} 
              setDiasSeleccionados={setDiasSeleccionados} 
              diasConCupo={diasConCupo}
              diasLlenos={diasLlenos}
              cargandoDias={cargandoDias}
              mesAnterior={mesAnterior}
              mesSiguiente={mesSiguiente}
              setRangoSeleccionado={setRangoSeleccionado}
              setActividadSeleccionada={setActividadSeleccionada}
            />
          </div>
        </div>

        {/* COLUMNA DERECHA: Paneles de Horarios/Actividades (Ocupa 5/12 del espacio) */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[410px] bg-white rounded-2xl p-1 justify-between">
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
               handleAnotarEnEspera={handleAnotarEnEspera}
               handleNotificarApertura={handleNotificarApertura}
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
                diasLlenos={diasLlenos}
             />
          )}
        </div>

      </div>

      {/* OVERLAY: Pantalla de espera de confirmación de MercadoPago */}
      {esperandoPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-slate-100">
            {/* Cambiado a border-teal-600 para consistencia de marca */}
            <div className="mx-auto mb-5 w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Esperando confirmación del pago…</h2>
            <p className="text-sm text-slate-600 mb-4">
              Completá el pago en la pestaña de MercadoPago que se abrió.
            </p>
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
              No cierres esta ventana, vamos a confirmar tu reserva automáticamente al recibir el aviso de MercadoPago.
            </p>
            <button
              onClick={handleCancelarPago}
              className="mt-6 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Cancelar proceso de pago
            </button>
          </div>
        </div>
      )}
    </div>
  );
}