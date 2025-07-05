import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeButton = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`fixed top-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
        isDark 
          ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-yellow-400/20' 
          : 'bg-gray-800 hover:bg-gray-700 text-white shadow-gray-800/20'
      }`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span className="text-xl">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default ThemeButton;