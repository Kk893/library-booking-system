import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const MobileLibraryCard = ({ library, index }) => {
  const { isDark } = useTheme();
  
  const getGradient = (index) => {
    const gradients = [
      'from-red-500 to-pink-500',
      'from-blue-500 to-cyan-500',
      'from-green-500 to-teal-500',
      'from-purple-500 to-indigo-500'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <Link 
      to={`/libraries/${library._id}`}
      className={`block rounded-xl overflow-hidden shadow-sm mb-3 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      <div className="flex">
        <div className={`w-24 h-24 bg-gradient-to-br ${getGradient(index)} flex items-center justify-center`}>
          <span className="text-2xl text-white">📚</span>
        </div>
        <div className="flex-1 p-3">
          <h3 className={`font-bold text-base line-clamp-1 mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {library.name}
          </h3>
          <p className={`text-xs line-clamp-1 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            📍 {library.area}, {library.city}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-yellow-500 text-xs">⭐</span>
              <span className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                4.{Math.floor(Math.random() * 5) + 3}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
            }`}>
              Open
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MobileLibraryCard;