import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';

const MobileProfileModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className={`absolute bottom-0 left-0 right-0 rounded-t-2xl ${isDark ? 'bg-gray-900' : 'bg-white'} max-h-[80vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {user ? 'My Profile' : 'Account'}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {user ? (
          <div className="p-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-red-500 to-pink-500">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">👤</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">{user.name}</h3>
                <p className="text-white text-sm opacity-90">{user.email}</p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              <Link to="/my-bookings" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🎫</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>My Bookings</span>
              </Link>
              
              <Link to="/favorites" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">❤️</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Favorites</span>
              </Link>
              
              <Link to="/offers" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🎁</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Offers & Rewards</span>
              </Link>
              
              <Link to="/notifications" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🔔</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Notifications</span>
              </Link>
              
              {(user.role === 'admin' || user.role === 'superadmin') && (
                <Link to="/qr-scanner" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <span className="text-xl">📱</span>
                  <span className={isDark ? 'text-white' : 'text-gray-800'}>QR Scanner</span>
                </Link>
              )}
              
              <Link to="/profile" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">⚙️</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Account Settings</span>
              </Link>
            </div>

            {/* Admin Links */}
            {(user.role === 'admin' || user.role === 'superadmin') && (
              <div className="border-t pt-4 space-y-2">
                {user.role === 'admin' && (
                  <Link to="/admin" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <span className="text-xl">🔑</span>
                    <span className={isDark ? 'text-white' : 'text-gray-800'}>Admin Panel</span>
                  </Link>
                )}
                
                {user.role === 'superadmin' && (
                  <Link to="/superadmin" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                    <span className="text-xl">👑</span>
                    <span className={isDark ? 'text-white' : 'text-gray-800'}>Super Admin</span>
                  </Link>
                )}
              </div>
            )}

            {/* Logout */}
            <div className="border-t pt-4">
              <button onClick={handleLogout} className="flex items-center space-x-3 p-3 rounded-lg w-full text-left hover:bg-red-50">
                <span className="text-xl">🚪</span>
                <span className="text-red-600">Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Login/Register Options */}
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-3xl">👤</span>
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Welcome to LibraryBook
              </h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Login to access your bookings and preferences
              </p>
              
              <div className="space-y-3">
                <Link to="/login" onClick={onClose} className="block w-full bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-lg font-semibold transition-all">
                  Login
                </Link>
                <Link to="/register" onClick={onClose} className={`block w-full border-2 border-red-500 text-red-500 hover:bg-red-50 py-3 px-6 rounded-lg font-semibold transition-all ${isDark ? 'hover:bg-gray-800' : ''}`}>
                  Create Account
                </Link>
              </div>
            </div>

            {/* Guest Options */}
            <div className="border-t pt-4 space-y-2">
              <Link to="/offers" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🎁</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Offers & Rewards</span>
              </Link>
              
              <Link to="/events" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🎆</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Events</span>
              </Link>
              
              <Link to="/libraries" onClick={onClose} className={`flex items-center space-x-3 p-3 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <span className="text-xl">🏢</span>
                <span className={isDark ? 'text-white' : 'text-gray-800'}>Browse Libraries</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileProfileModal;