const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
// Extendemos las opciones de fetch para incluir nuestra propiedad personalizada
interface FetchOptions extends RequestInit {
  omitToken?: boolean;
}

export async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Buscamos el token solo si NO nos pidieron omitirlo explícitamente
  if (typeof window !== 'undefined' && !options?.omitToken) {
    const token = localStorage.getItem('kinepro_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const finalHeaders = {
    ...headers,
    ...options?.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: finalHeaders, 
  });

  const data = await res.json().catch(() => null);
  
  if (!res.ok) {
    const msg = data?.message ?? `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  
  return data as T;
}