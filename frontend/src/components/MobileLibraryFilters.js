import React from 'react';
import { useTheme } from '../context/ThemeContext';

const MobileLibraryFilters = ({ activeFilter, setActiveFilter }) => {
  const { isDark } = useTheme();
  
  const filters = [
    { id: 'all', label: '📚 All' },
    { id: 'popular', label: '⭐ Popular' },
    { id: 'recent', label: '🆕 Recent' },
    { id: 'rated', label: '🏆 Top Rated' }
  ];

  return (
    <div className="md:hidden px-4 py-3">
      <div className="flex overflow-x-auto horizontal-scroll space-x-3">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              activeFilter === filter.id
                ? 'bg-red-500 text-white'
                : isDark 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileLibraryFilters;