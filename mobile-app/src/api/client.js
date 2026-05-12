import axios from 'axios';
import { API_URL } from '../config/env';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'تعذر الاتصال بالخادم. تأكد من تشغيل API ومن ضبط رابط الخادم داخل التطبيق.';

    return Promise.reject({ ...error, message });
  }
);

export default api;
