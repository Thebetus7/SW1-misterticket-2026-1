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

  // Manejo de refresh token en caso de 401 Unauthorized
  if (response.status === 401 && !options._retry) {
    options._retry = true; // Prevenir bucles de reintentos
    const refreshToken = Cookies.get('refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_URL}/usuarios/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken })
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.access;
          
          // Guardar el nuevo access token
          Cookies.set('access_token', newAccessToken, { expires: 1 });

          // Reintentar la llamada original con el nuevo token
          const retryHeaders = {
            ...headers,
            'Authorization': `Bearer ${newAccessToken}`
          };
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders
          });

          if (retryResponse.ok) {
            if (retryResponse.status === 204) return null;
            return retryResponse.json();
          }
        } else {
          // El refresh token ha expirado o es inválido, borramos las cookies de autenticación
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          Cookies.remove('user');
        }
      } catch (err) {
        console.error("Error intentando refrescar el token de acceso:", err);
      }
    }
  }

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
