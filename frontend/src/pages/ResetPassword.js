import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password
      });

      if (response.data.token) {
        // Auto login after successful password reset
        login(response.data.token, response.data.user);
        toast.success('🎉 Password reset successful! You are now logged in.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

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
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-white">🔑</span>
          </div>
          
          <h2 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Reset Password
          </h2>
          
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 pl-12 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xl">🔒</span>
              </div>
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">
                  {showPassword ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 pl-12 pr-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-xl">🔒</span>
              </div>
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="text-xl">
                  {showConfirmPassword ? '🙈' : '👁️'}
                </span>
              </button>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {password && (
            <div className={`p-3 rounded-lg ${
              isDark ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Password Strength:
              </p>
              <div className="space-y-1">
                <div className={`flex items-center text-xs ${
                  password.length >= 6 ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <span className="mr-2">{password.length >= 6 ? '✅' : '❌'}</span>
                  At least 6 characters
                </div>
                <div className={`flex items-center text-xs ${
                  /[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <span className="mr-2">{/[A-Z]/.test(password) ? '✅' : '❌'}</span>
                  One uppercase letter
                </div>
                <div className={`flex items-center text-xs ${
                  /[0-9]/.test(password) ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <span className="mr-2">{/[0-9]/.test(password) ? '✅' : '❌'}</span>
                  One number
                </div>
              </div>
            </div>
          )}

          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className={`p-3 rounded-lg ${
              password === confirmPassword 
                ? (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
                : (isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200')
            }`}>
              <p className={`text-sm flex items-center ${
                password === confirmPassword ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="mr-2">
                  {password === confirmPassword ? '✅' : '❌'}
                </span>
                {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 6}
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              '🔑 Reset Password'
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
      </div>
    </div>
  );
};

export default ResetPassword;