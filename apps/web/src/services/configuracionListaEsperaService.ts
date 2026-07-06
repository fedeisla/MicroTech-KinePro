
import { apiFetch } from '@/lib/api'
export interface ConfiguracionSistema {
  id?: number;
  porcentajeListaEspera: number;
  contadorRespiracion: number;
  horasExpiracionEspera: number;
}

export const getConfiguracion = async (): Promise<ConfiguracionSistema> => {
  // apiFetch ya le agrega la API_BASE y el token automáticamente
  // y retorna directamente los datos tipados.
  return apiFetch<ConfiguracionSistema>('/configuracion');
};

export const updateConfiguracion = async (
  data: Partial<ConfiguracionSistema>
): Promise<ConfiguracionSistema> => {
  // apiFetch se encarga del Content-Type y de tirar error si falla
  return apiFetch<ConfiguracionSistema>('/configuracion', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};