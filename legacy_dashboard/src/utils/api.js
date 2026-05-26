import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('robomap_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (email, password) =>
  api.post('/login', { email, password }).then((r) => r.data);

export const fetchDashboardData = () =>
  api.get('/dashboard-data').then((r) => r.data);

export const fetchLogs = () =>
  api.get('/logs').then((r) => r.data);

export default api;
