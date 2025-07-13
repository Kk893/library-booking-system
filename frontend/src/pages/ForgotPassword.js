import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      
      if (response.data.success) {
        setEmailSent(true);
        toast.success('📧 Password reset email sent! Check your inbox.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
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
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl text-white">📧</span>
            </div>
            
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Email Sent Successfully!
            </h2>
            
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your email and follow the instructions to reset your password.
            </p>
            
            <div className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                💡 <strong>Tip:</strong> The reset link will expire in 1 hour for security reasons.
                If you don't see the email, check your spam folder.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Send Another Email
              </button>
              
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

  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-purple-50'
    }`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl backdrop-blur-lg border transition-all duration-500 ${
        isDark 
          ? 'bg-gray-800/90 border-gray-700' 
          : 'bg-white/90 border-white/20'
      }`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-white">🔐</span>
          </div>
          
          <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Forgot Password?
          </h2>
          
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            No worries! Enter your email address and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 pl-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter your email address"
                required
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xl">📧</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending Reset Link...
              </div>
            ) : (
              '🚀 Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Remember your password?{' '}
            <Link 
              to="/login" 
              className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
            >
              Back to Login
            </Link>
          </p>
        </div>

        <div className={`mt-6 p-4 rounded-lg ${
          isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
            🛡️ <strong>Security Note:</strong> For your protection, the reset link will expire in 1 hour.
            If you don't receive the email within a few minutes, please check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;