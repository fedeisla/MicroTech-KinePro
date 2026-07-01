import { apiFetch } from "@/lib/api";

export interface InscribirData {
  turnoId: number;
  prioridad: number;
}

export const listaEsperaService = {
  
  // POST: Inscribir paciente (Para el usuario final)
  inscribir: async (data: InscribirData) => {
    return apiFetch('/lista-espera/inscribir', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },

  // DELETE: Cancelar solicitud (Para el usuario final)
  cancelar: async (id: number) => {
    return apiFetch(`/lista-espera/${id}`, { 
      method: 'DELETE' 
    });
  },

  // PATCH: Responder a la notificación (Aceptar/Rechazar)
  responderNotificacion: async ( id: number, acepta: boolean, turnoId: number ): Promise<{ message?: string; reservaId?: number; estado?: string }> => { 
          return apiFetch(`/lista-espera/${id}/responder`, {
            method: 'PATCH',
            body: JSON.stringify({ acepta, turnoId }),
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

  // POST: Inscribe a un paciente por su email cuando el turno está lleno
  inscribirAdmin: async (email: string, turnoId: number, prioridad: number) => {
    return apiFetch('/lista-espera/admin/inscribir', {
      method: 'POST',
      body: JSON.stringify({ email, turnoId, prioridad })
    });
  }

};