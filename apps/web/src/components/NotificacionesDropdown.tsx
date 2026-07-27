"use client";

import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, CalendarPlus, AlertTriangle, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Notificacion = {
  id: number;
  titulo: string;
  descripcion: string;
  tiempo: string;
  leida: boolean;
  tipo: 'turno' | 'alerta' | 'sistema';
};

export default function NotificacionesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuth();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  const noLeidasCount = notificaciones.filter(n => !n.leida).length;

  const marcarTodasComoLeidas = async () => {
    try {
      await apiFetch('/notificaciones/marcar-leidas', { method: 'PATCH' });
      setNotificaciones(notificaciones.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      console.error('No se pudieron marcar como leídas', err);
    }
  };

  const fetchNotis = async () => {
    try {
      const data = await apiFetch<any[]>('/notificaciones');
      setNotificaciones(data.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  };

  // Obtener notificaciones al montar para mostrar el contador incluso sin abrir el dropdown
  useEffect(() => {
    fetchNotis();
    // Refresco periódico: los recordatorios llegan por cron (~1 min) sin recargar la página
    const id = window.setInterval(fetchNotis, 5_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refrescar al abrir el dropdown
  useEffect(() => {
    if (!isOpen) return;
    fetchNotis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const obtenerIconoTipo = (tipo: string) => {
    const t = tipo?.toString().toUpperCase();
    switch (t) {
      case 'TURN0':
      case 'TURNO':
      case 'INFORMATIVA':
      case 'RECORDATORIO':
        return {
          icono: <CalendarPlus className="w-4 h-4 text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-100'
        };
      case 'CANCELACION_TURNO':
      case 'ALERTA':
        return {
          icono: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          bgColor: 'bg-rose-50 border-rose-100'
        };
      case 'SISTEMA':
      default:
        return {
          icono: <Info className="w-4 h-4 text-blue-600" />,
          bgColor: 'bg-blue-50 border-blue-100'
        };
    }
  };

  const formatearTiempoTranscurrido = (isoFecha: string) => {
    const fecha = new Date(isoFecha);
    if (Number.isNaN(fecha.getTime())) return isoFecha;

    const ahora = Date.now();
    const diferenciaSegundos = Math.floor((ahora - fecha.getTime()) / 1000);

    if (diferenciaSegundos < 60) {
      return 'hace unos segundos';
    }

    const diferenciaMinutos = Math.floor(diferenciaSegundos / 60);
    if (diferenciaMinutos < 60) {
      return `hace ${diferenciaMinutos} minuto${diferenciaMinutos === 1 ? '' : 's'}`;
    }

    const diferenciaHoras = Math.floor(diferenciaMinutos / 60);
    if (diferenciaHoras < 24) {
      return `hace ${diferenciaHoras} hora${diferenciaHoras === 1 ? '' : 's'}`;
    }

    const diferenciaDias = Math.floor(diferenciaHoras / 24);
    return `hace ${diferenciaDias} día${diferenciaDias === 1 ? '' : 's'}`;
  };

  return (
    <div className="relative inline-block text-left">
      
      {/* Botón de la Campana */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 focus:outline-none border border-transparent hover:border-slate-100"
      >
        <Bell className={`w-4 h-4 transition-transform ${isOpen ? 'scale-105' : ''}`} />
        <span className="text-sm font-semibold hidden md:inline text-slate-600">Notificaciones</span>
        
        {noLeidasCount > 0 && (
          <span className="absolute top-0.5 left-4.5 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm transform translate-x-0.5 -translate-y-0.5">
            {noLeidasCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)}></div>

          <div className="absolute right-0 mt-2 w-96 bg-white shadow-xl border border-slate-100 z-30 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            
            {/* Cabecera del panel */}
            <div className="p-4 bg-slate-50/60 flex items-center justify-between border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Notificaciones</span>
              {noLeidasCount > 0 && (
                <button 
                  onClick={marcarTodasComoLeidas}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5 hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Marcar todas como leídas</span>
                </button>
              )}
            </div>

            {/* Lista de notificaciones */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notificaciones.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Bell className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <span>No posees notificaciones</span>
                </div>
              ) : (
                notificaciones.map((notif) => {
                  const configTipo = obtenerIconoTipo(notif.tipo);
                  return (
                    <div 
                      key={notif.id} 
                      className={`p-4 transition-colors flex gap-3 items-start ${notif.leida ? 'bg-white' : 'bg-teal-50/20'}`}
                    >
                      <div className={`p-2 rounded-xl border shrink-0 ${configTipo.bgColor} shadow-sm`}>
                        {configTipo.icono}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm leading-snug break-words ${notif.leida ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                            {notif.titulo}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider pt-0.5 whitespace-nowrap">
                            {formatearTiempoTranscurrido(notif.tiempo)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">
                          {notif.descripcion}
                        </p>
                      </div>

                      {!notif.leida && (
                        <span className="w-2 h-2 mt-2 bg-teal-500 rounded-full shrink-0 shadow-sm shadow-teal-500/20" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer eliminado: siempre mostramos las últimas 4 notificaciones */}

          </div>
        </>
      )}
    </div>
  );
}