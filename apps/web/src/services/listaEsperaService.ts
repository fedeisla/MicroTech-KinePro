import { apiFetch } from "@/lib/api";

export interface InscribirData {
  turnoId: number;
  prioridad: number;
}

export const listaEsperaService = {
  
  // POST: Inscribir paciente (Para el usuario final - Individual)
  inscribir: async (data: InscribirData) => {
    return apiFetch('/lista-espera/inscribir', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },

  // POST: Inscripción fija para usuario logueado
  inscribirTurnoFijoVirtual: async (turnoId: number, fechasString: string[]) => {
    return apiFetch('/lista-espera/inscribir-fijo', { 
      method: 'POST',
      body: JSON.stringify({ turnoId, fechasString })
    });
  },

  // POST: Inscripción fija para admin/presencial (vía email)
  inscribirTurnoFijoPresencial: async (email: string, turnoInicialId: number, fechasString: string[], prioridad: number) => {
    return apiFetch('/lista-espera/admin/inscribir-fijo', {
      method: 'POST',
      body: JSON.stringify({ email, turnoInicialId, fechasString, prioridad })
    });
  },
 obtenerMisEstados: async (): Promise<any[]> => {
    return apiFetch('/lista-espera/mis-estados');
  },

  // DELETE: Cancelar solicitud
  cancelar: async (id: number) => {
    return apiFetch(`/lista-espera/${id}`, { 
      method: 'DELETE' 
    });
  },

  // PATCH: Responder a la notificación (Aceptar/Rechazar)
  responderNotificacion: async (
    id: number, 
    acepta: boolean, 
    turnoId: number
  ): Promise<{ 
    message?: string; 
    reservaIds?: number[];
    reservaId?: number; 
    estado?: string;
    montoTotal?: number;
    aplicaDescuento?: boolean;
    porcentajeAplicado?: number;
  }> => {
    return apiFetch(`/lista-espera/${id}/responder`, {
      method: 'PATCH', 
      body: JSON.stringify({ acepta, turnoId }) 
    });
  },

  // GET: Obtener estado del paciente logueado
  getMiEstado: async () => {
    return apiFetch('/lista-espera/mi-estado');
  },

  // ==========================================================
  // ─── MÉTODOS DE ADMINISTRADOR ─────────────────────────────
  // ==========================================================
  
  // GET: Trae la lista de espera de un turno específico
  obtenerListaAdmin: async (turnoId: number): Promise<any[]> => {
    return apiFetch(`/lista-espera/turno/${turnoId}/admin`);
  },

  // DELETE: Elimina a un paciente de la lista de espera
  eliminarDeListaAdmin: async (id: number) => {
    return apiFetch(`/lista-espera/${id}/admin`, {
      method: 'DELETE'
    });
  },

  // POST: Inscribe a un paciente por su email (Individual)
  inscribirAdmin: async (email: string, turnoId: number, prioridad: number) => {
    return apiFetch('/lista-espera/admin/inscribir', {
      method: 'POST',
      body: JSON.stringify({ email, turnoId, prioridad })
    });
  }
};