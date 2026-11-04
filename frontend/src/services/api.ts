import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Injeta token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('par_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redireciona para login se 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('par_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
