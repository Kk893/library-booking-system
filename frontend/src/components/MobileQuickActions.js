import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const MobileQuickActions = () => {
  const { isDark } = useTheme();
  
  const actions = [
    { icon: '🪑', label: 'Book Seat', path: '/libraries' },
    { icon: '📚', label: 'Find Books', path: '/books' },
    { icon: '🎟️', label: 'My Bookings', path: '/my-bookings' },
    { icon: '❤️', label: 'Favorites', path: '/favorites' }
  ];

  return (
    <div className="md:hidden px-4 py-4">
      <div className={`grid grid-cols-4 gap-2 rounded-xl p-4 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      } shadow-sm`}>
        {actions.map((action, index) => (
          <Link 
            key={index} 
            to={action.path}
            className="flex flex-col items-center"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
              index % 4 === 0 ? 'bg-red-100' :
              index % 4 === 1 ? 'bg-blue-100' :
              index % 4 === 2 ? 'bg-green-100' :
              'bg-purple-100'
            }`}>
              <span className="text-xl">{action.icon}</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileQuickActions;