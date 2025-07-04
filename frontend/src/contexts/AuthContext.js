import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const response = await axios.get('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setUser(response.data.user);
        }
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('auth_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/register', userData);
      toast.success('Registration successful! Please verify your email.');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      toast.error(err.response?.data?.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
      toast.success('Login successful!');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      toast.error(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Social login
  const socialLogin = async (provider, token) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/api/auth/social-login/${provider}`, { token });
      localStorage.setItem('auth_token', response.data.token);
      setUser(response.data.user);
      toast.success('Login successful!');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Social login failed');
      toast.error(err.response?.data?.message || 'Social login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (email, otp) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      toast.success('Verification successful!');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
      toast.error(err.response?.data?.message || 'Verification failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    router.push('/');
    toast.info('You have been logged out');
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    socialLogin,
    verifyOTP,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}