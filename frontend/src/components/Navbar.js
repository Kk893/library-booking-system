import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import ProfileDropdown from './ProfileDropdown';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Secret key combination: Ctrl+Shift+S for Super Admin
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        if (user?.role === 'superadmin') {
          navigate('/superadmin');
          toast.success('🔐 Super Admin Access Granted!');
        } else {
          toast.error('🚫 Access Denied - Super Admin Only!');
        }
      }
      // Secret key combination: Ctrl+Shift+A for Admin
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        if (user?.role === 'admin') {
          navigate('/admin');
          toast.success('🔑 Admin Panel Access Granted!');
        } else {
          toast.error('🚫 Access Denied - Admin Only!');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`shadow-lg sticky top-0 z-50 transition-all duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">📖</span>
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              LibraryBook
            </span>
          </Link>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🏠 Home
            </Link>
            <Link to="/libraries" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🏢 Libraries
            </Link>
            {user && user.role === 'user' && (
              <Link to="/dashboard" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                📋 Dashboard
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                🔑 Admin Panel
              </Link>
            )}
            {user?.role === 'superadmin' && (
              <Link to="/superadmin" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                👑 Super Admin
              </Link>
            )}
            <Link to="#" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🎁 Offers
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <ProfileDropdown />
            ) : (
              <div className="flex space-x-3">
                <Link 
                  to="/login" 
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-medium transition-all transform hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;