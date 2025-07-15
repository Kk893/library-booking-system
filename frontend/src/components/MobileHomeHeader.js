import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const MobileHomeHeader = () => {
  const { isDark } = useTheme();

  return (
    <div className="md:hidden">
      <div className={`px-4 py-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">📖</span>
            </div>
            <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              LibraryBook
            </h1>
          </div>
          <Link to="/notifications" className="p-2">
            <span className="text-xl">🔔</span>
          </Link>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search for books, libraries..."
            className={`w-full px-4 py-2 pl-10 rounded-lg border text-sm ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      <div className="flex overflow-x-auto horizontal-scroll px-4 py-3 space-x-2 bg-gradient-to-r from-red-500 to-pink-500">
        <div className="flex-shrink-0">
          <Link to="/libraries" className="px-3 py-1 bg-white rounded-full text-xs font-medium text-red-500 whitespace-nowrap">
            All Libraries
          </Link>
        </div>
        <div className="flex-shrink-0">
          <Link to="/books" className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white whitespace-nowrap">
            Popular Books
          </Link>
        </div>
        <div className="flex-shrink-0">
          <Link to="/events" className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white whitespace-nowrap">
            Events
          </Link>
        </div>
        <div className="flex-shrink-0">
          <Link to="/offers" className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white whitespace-nowrap">
            Offers
          </Link>
        </div>
        <div className="flex-shrink-0">
          <Link to="/libraries?filter=nearby" className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white whitespace-nowrap">
            Near Me
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MobileHomeHeader;