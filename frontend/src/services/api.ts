import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('focototal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login se o token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('focototal_token');
      localStorage.removeItem('focototal_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
