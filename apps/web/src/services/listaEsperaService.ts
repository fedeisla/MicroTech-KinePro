// src/services/listaEsperaService.ts
 // Asegúrate de ajustar esta ruta

import { apiFetch } from "@/lib/api";

export interface InscribirData {
  turnoId: number;
  prioridad: number;
}

export const listaEsperaService = {
  
  // POST: Inscribir paciente
  inscribir: async (data: InscribirData) => {
    return apiFetch('/lista-espera/inscribir', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },

  // DELETE: Cancelar solicitud
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

  getMiEstado: async () => {
    return apiFetch('/lista-espera/mi-estado');
  }

};