import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import ProfileDropdown from './ProfileDropdown';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
            <span className={`text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              LibraryBook
            </span>
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg ${isDark ? 'text-white hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
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
            <Link to="/books" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              📚 Books
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
            <Link to="/offers" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🎁 Offers
            </Link>
            <Link to="/events" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🎆 Events
            </Link>
            {user && (
              <Link to="/notifications" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                🔔 Notifications
              </Link>
            )}
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
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link 
                to="/" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏠 Home
              </Link>
              <Link 
                to="/libraries" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏢 Libraries
              </Link>
              <Link 
                to="/books" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                📚 Books
              </Link>
              {user && user.role === 'user' && (
                <Link 
                  to="/dashboard" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  📋 Dashboard
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  🔑 Admin Panel
                </Link>
              )}
              {user?.role === 'superadmin' && (
                <Link 
                  to="/superadmin" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  👑 Super Admin
                </Link>
              )}
              <Link 
                to="/offers" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🎁 Offers
              </Link>
              <Link 
                to="/events" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🎆 Events
              </Link>
              {user && (
                <Link 
                  to="/notifications" 
                  className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  🔔 Notifications
                </Link>
              )}
              
              {/* Mobile auth buttons */}
              <div className="pt-4 border-t border-gray-200">
                {user ? (
                  <div className="space-y-2">
                    <div className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Logged in as {user.name}
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/');
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                    >
                      🚪 Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link 
                      to="/login" 
                      className={`block px-3 py-2 rounded-md text-base font-medium ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      className="block mx-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-center font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;