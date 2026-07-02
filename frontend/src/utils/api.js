import axios from 'axios';
import { getApiErrorMessage } from './notificationService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const storeId = localStorage.getItem('storeId');
  if (storeId && storeId !== 'undefined' && storeId !== 'null') {
    config.headers['x-store-id'] = storeId;
  } else if (storeId) {
    localStorage.removeItem('storeId');
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Catch offline write requests
    if (
      !error.response && 
      typeof navigator !== 'undefined' && 
      navigator.onLine === false && 
      error.config && 
      ['post', 'put', 'delete', 'patch'].includes(error.config.method?.toLowerCase())
    ) {
      try {
        const { queueOfflineMutation } = await import('../services/offlineService');
        const data = typeof error.config.data === 'string' ? JSON.parse(error.config.data) : error.config.data;
        queueOfflineMutation(error.config.url, error.config.method, data);
        error.userMessage = 'You are offline. Your change was queued locally and will sync when connection returns.';
      } catch (err) {
        console.error('Error queueing offline request:', err);
      }
    }

    error.userMessage = error.userMessage || getApiErrorMessage(error);
    return Promise.reject(error);
  }
);

export default api;
