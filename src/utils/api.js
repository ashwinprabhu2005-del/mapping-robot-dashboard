import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({ baseURL: BASE_URL });

export const fetchDashboardData = () =>
  api.get('/dashboard-data').then((r) => r.data);

export const fetchLogs = () =>
  api.get('/logs').then((r) => r.data);

export default api;
