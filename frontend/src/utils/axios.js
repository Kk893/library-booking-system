import axios from 'axios';

// Set base URL for all axios requests
axios.defaults.baseURL = 'http://localhost:5000';

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isNotificationRequest = error.config?.url?.includes('/notifications');
      const isAuthRequest = error.config?.url?.includes('/auth/');
      
      // Don't logout on notification or auth requests
      if (!isNotificationRequest && !isAuthRequest) {
        console.warn('Unauthorized access, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        console.warn('API request failed (401), but not logging out');
      }
    }
    return Promise.reject(error);
  }
);

export default axios;