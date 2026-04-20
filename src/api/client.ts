export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('lingq_token');

  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    'x-timezone-offset': new Date().getTimezoneOffset().toString(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.headers.get('content-type')?.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || 'API Request Failed');
    } else {
      const text = await response.text();
      console.error("Non-JSON response:", text);
      throw new Error('Server returned non-JSON error');
    }
  }

  return response.json();
};