import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const MobileTopBar = () => {
  const { isDark } = useTheme();
  const [selectedCity, setSelectedCity] = useState('Jaipur');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className={`md:hidden sticky top-0 z-40 ${isDark ? 'bg-gray-900' : 'bg-white'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="px-4 py-3 space-y-3">
        {/* Location and Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📖</span>
            </div>
            <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              LibraryBook
            </span>
          </div>
          
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className={`px-3 py-1 rounded-lg border text-sm ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option>Jaipur</option>
            <option>Mumbai</option>
            <option>Delhi</option>
            <option>Bangalore</option>
            <option>Chennai</option>
            <option>Pune</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search for books, libraries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 pl-10 rounded-lg border text-sm ${
              isDark 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default MobileTopBar;