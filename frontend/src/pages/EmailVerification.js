import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const EmailVerification = () => {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link');
      setLoading(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axios.post('/api/auth/verify-email', { token });

      if (response.data.token) {
        // Auto login after successful verification
        login(response.data.token, response.data.user);
        setVerified(true);
        toast.success('🎉 Email verified successfully! Welcome to Library Booking!');
        
        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setError(error.response?.data?.message || 'Email verification failed');
      toast.error(error.response?.data?.message || 'Email verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-purple-50'
      }`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-500 ${
          isDark 
            ? 'bg-gray-800/90 border-gray-700' 
            : 'bg-white/90 border-white/20'
        }`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            </div>
            
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Verifying Your Email...
            </h2>
            
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-green-50 to-blue-50'
      }`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-500 ${
          isDark 
            ? 'bg-gray-800/90 border-gray-700' 
            : 'bg-white/90 border-white/20'
        }`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">✅</span>
            </div>
            
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Email Verified Successfully!
            </h2>
            
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Welcome to Library Booking System! Your account has been verified and you are now logged in.
            </p>
            
            <div className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                🎉 <strong>You're all set!</strong> Redirecting to your dashboard in a few seconds...
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Go to Dashboard
              </button>
              
              <Link
                to="/libraries"
                className="block w-full text-center py-3 rounded-lg font-semibold transition-all border hover:scale-105 bg-blue-500 hover:bg-blue-600 text-white"
              >
                Explore Libraries
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
        isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-red-50 to-orange-50'
      }`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-500 ${
          isDark 
            ? 'bg-gray-800/90 border-gray-700' 
            : 'bg-white/90 border-white/20'
        }`}>
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">❌</span>
            </div>
            
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Verification Failed
            </h2>
            
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            
            <div className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                💡 <strong>Need help?</strong> The verification link may have expired. 
                Please try registering again or contact support.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link
                to="/register"
                className="block w-full text-center bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Register Again
              </Link>
              
              <Link
                to="/login"
                className="block w-full text-center py-3 rounded-lg font-semibold transition-all border hover:scale-105 bg-gray-500 hover:bg-gray-600 text-white"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EmailVerification;