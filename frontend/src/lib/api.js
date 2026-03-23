import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Cliente básico para hacer peticiones API.
 * Se encarga de adjuntar el JWT token en cada petición.
 */
export async function fetchApi(endpoint, options = {}) {
  const token = Cookies.get('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Opcional: Manejo de refresh token en este nivel si el status es 401

  if (!response.ok) {
    let errMessage = 'Ocurrió un error en la solicitud.';
    try {
      const errorData = await response.json();
      errMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch (e) {}
    throw new Error(errMessage);
  }

  // Devolver null en vez de romper si es un 204 No Content
  if (response.status === 204) return null;
  
  return response.json();
}
