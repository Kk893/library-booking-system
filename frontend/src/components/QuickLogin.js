import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const QuickLogin = () => {
  const { login, user, refreshAuth } = useAuth();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const quickLogin = async (credentials) => {
    try {
      setLoading(true);
      await login(credentials);
      toast.success(`Welcome ${credentials.email}!`);
    } catch (error) {
      toast.error('Login failed: ' + error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-green-50'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm ${isDark ? 'text-green-400' : 'text-green-800'}`}>
            ✅ Logged in as: {user.name} ({user.email})
          </p>
          <button
            onClick={refreshAuth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-blue-50'}`}>
      <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        🚀 Quick Login (For Testing)
      </h3>
      
      <div className="space-y-2">
        <button
          onClick={() => quickLogin({ email: 'user@test.com', password: 'password123' })}
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳ Logging in...' : '👤 Login as Regular User'}
        </button>
        
        <button
          onClick={() => quickLogin({ email: 'admin@test.com', password: 'password123' })}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳ Logging in...' : '🔑 Login as Admin'}
        </button>
        
        <button
          onClick={() => quickLogin({ email: 'super@admin.com', password: 'password123' })}
          disabled={loading}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳ Logging in...' : '👑 Login as Super Admin'}
        </button>
      </div>
      
      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        💡 Use these buttons to quickly test notifications
      </p>
    </div>
  );
};

export default QuickLogin;