import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  remove: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getCategoryBreakdown: (params) => api.get('/expenses/category-breakdown', { params }),
  getDailyTotal: (date) => api.get('/expenses/daily/total', { params: { date } }),
  getPeriodTotal: (startDate, endDate) => api.get('/expenses/period/total', { params: { startDate, endDate } }),
};

export default api;
