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

  // Cambiado: Ahora es un array de solicitudes y agregamos estado para el modal
  const [solicitudesEspera, setSolicitudesEspera] = useState<any[]>([]);
  const [modalListasAbierto, setModalListasAbierto] = useState(false);
  const [cargandoCancelacion, setCargandoCancelacion] = useState(false);

  // La solicitud principal siempre será la primera del array ordenado
  const solicitudPrincipal = solicitudesEspera.length > 0 ? solicitudesEspera[0] : null;

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

  // Modificado: Ahora recibe un ID opcional para poder cancelar desde el modal
  const handleCancelarEspera = async (idAEliminar?: number) => {
    const id = idAEliminar || solicitudPrincipal?.id;
    if (!id) return;

    setCargandoCancelacion(true);
    try {
      await listaEsperaService.cancelar(id);
      // Actualizamos el array filtrando la cancelada
      setSolicitudesEspera(prev => prev.filter(s => s.id !== id));
      toast.info('Solicitud de espera cancelada');
      if (solicitudesEspera.length <= 1) {
        setModalListasAbierto(false);
      }
    } catch (error) {
      toast.error('No se pudo cancelar la solicitud');
    } finally {
      setCargandoCancelacion(false);
    }
  };

  const handleResponderNotificacion = async (acepta: boolean) => {
    if (!solicitudPrincipal) return;
    setCargandoCancelacion(true);

    try {
      if (!acepta) {
        await listaEsperaService.responderNotificacion(
          solicitudPrincipal.id, 
          false, 
          solicitudPrincipal.turnoId
        );
        toast.info('Rechazaste el turno');
        setSolicitudesEspera(prev => prev.filter(s => s.id !== solicitudPrincipal.id));
        return;
      }

      toast.info('Procesando confirmación...', { duration: 2000 });

      const resReserva = await listaEsperaService.responderNotificacion(
        solicitudPrincipal.id, 
        true, 
        solicitudPrincipal.turnoId
      );

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

      let pref;
      try {
        if (esFijo) {
          pref = await crearPreferenceMPFijo(resReserva.reservaIds!);
        } else {
          pref = await crearPreferenceMP(resReserva.reservaId!); 
        }
      } catch (mpError) {
        if (esFijo) await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {});
        else await cancelarPagoMP(resReserva.reservaId!).catch(() => {});
        
        toast.error('No se pudo conectar con MercadoPago, intente nuevamente', { duration: 5000 });
        return;
      }

      if (!pref.init_point) {
        if (esFijo) await cancelarPagoMPFijo(resReserva.reservaIds!).catch(() => {});
        else await cancelarPagoMP(resReserva.reservaId!).catch(() => {});
        
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
      
      if (esFijo) {
        reservaIdsGrupoEsperaRef.current = resReserva.reservaIds!;
        grupoIdEsperaRef.current = (pref as any).grupoId; 
      } else {
        reservaIdEsperaRef.current = resReserva.reservaId!;
      }

      intervaloRef.current = setInterval(async () => {
        try {
          let r;
          if (esFijo) {
            r = await verificarPagoMPFijo((pref as any).grupoId); 
          } else {
            r = await verificarPagoMP(resReserva.reservaId!);
          }

          if (r.status === 'ok') {
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            setEsperandoPago(false); 
            // Eliminamos la solicitud confirmada del array
            setSolicitudesEspera(prev => prev.filter(s => s.id !== solicitudPrincipal.id));
            
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
          // Silencioso
        }
      }, 3000);

      timeoutRef.current = setTimeout(async () => {
        if (intervaloRef.current) clearInterval(intervaloRef.current);
        if (!pagoConfirmado) {
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

  // Modificado: Trae las solicitudes y las ORDENA para mostrar la principal
  useEffect(() => {
    const cargarEstadosEspera = async () => {
      try {
        const estados = await listaEsperaService.obtenerMisEstados(); // <- Asegurate que este endpoint devuelva array
        if (estados && estados.length > 0) {
          // ORDENAMOS EL ARRAY ANTES DE GUARDARLO
          estados.sort((a: any, b: any) => {
            if (a.estado === 'NOTIFICADO' && b.estado !== 'NOTIFICADO') return -1;
            if (b.estado === 'NOTIFICADO' && a.estado !== 'NOTIFICADO') return 1;
            if (a.personasAdelante !== b.personasAdelante) {
              return a.personasAdelante - b.personasAdelante;
            }
            return new Date(a.fecha_anotacion).getTime() - new Date(b.fecha_anotacion).getTime();
          });
          setSolicitudesEspera(estados);
        } else {
          setSolicitudesEspera([]);
        }
      } catch (e) {
        console.log("No hay solicitudes de espera activas");
        setSolicitudesEspera([]);
      }
    };

    cargarEstadosEspera();
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
      {solicitudPrincipal && (
        <div className="mb-6">
          <BannerEspera 
            estado={solicitudPrincipal.estado} 
            personasAdelante={solicitudPrincipal.personasAdelante}
            totalActivas={solicitudesEspera.length}
            onVerTodas={() => setModalListasAbierto(true)}
            turnoInfo={{
              actividad: solicitudPrincipal.turno?.tipoActividad?.nombre || 'Turno', 
              fecha: solicitudPrincipal.turno?.fecha, 
              hora: solicitudPrincipal.turno?.hora_inicio
            }}
            onCancelar={() => handleCancelarEspera()}
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

      {/* MODAL: Listas de Espera Activas */}
      {modalListasAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">Mis Listas de Espera Activas</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {solicitudesEspera.map((s) => (
                <div key={s.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{s.turno?.tipoActividad?.nombre || 'Turno'}</p>
                    <p className="text-xs text-slate-500">
                      {s.turno?.fecha?.split('T')[0]?.split('-').reverse().join('/')} - {s.turno?.hora_inicio?.includes('T') ? s.turno.hora_inicio.split('T')[1].substring(0, 5) : s.turno?.hora_inicio?.substring(0, 5)}hs
                    </p>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      {s.personasAdelante > 0 ? `${s.personasAdelante} personas adelante` : 'Sos el primero de la lista'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${s.estado === 'NOTIFICADO' ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                      {s.estado}
                    </span>
                    {s.estado === 'PENDIENTE' && (
                      <button 
                        onClick={() => handleCancelarEspera(s.id)}
                        disabled={cargandoCancelacion}
                        className="text-[11px] text-red-500 hover:text-red-700 font-semibold underline disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setModalListasAbierto(false)}
              className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}