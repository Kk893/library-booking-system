import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import MobileProfileModal from './MobileProfileModal';

const BottomNavigation = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/libraries', label: 'Libraries', icon: '🏢' },
    { path: '/events', label: 'Events', icon: '🎆' },
    { path: '/profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          if (item.path === '/profile') {
            return (
              <button
                key={item.path}
                onClick={() => setShowProfileModal(true)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? isDark ? 'text-red-500 bg-gray-800' : 'text-red-500 bg-red-50'
                    : isDark ? 'text-gray-400 hover:text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                location.pathname === item.path
                  ? isDark ? 'text-red-500 bg-gray-800' : 'text-red-500 bg-red-50'
                  : isDark ? 'text-gray-400 hover:text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      
      <MobileProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </div>
  );
};

export default BottomNavigation;