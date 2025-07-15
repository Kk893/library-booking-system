import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LibrarySlider = ({ libraries, title = "Libraries Near You" }) => {
  const { isDark } = useTheme();

  return (
    <div className="py-4">
      <div className="mobile-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`mobile-subheading ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {title}
          </h2>
          <Link to="/libraries" className={`text-sm font-medium ${isDark ? 'text-red-500' : 'text-red-500'}`}>
            View All →
          </Link>
        </div>
        
        <div className="flex space-x-4 overflow-x-auto horizontal-scroll pb-2">
          {libraries?.slice(0, 6).map((library, index) => (
            <Link
              key={library._id}
              to={`/libraries/${library._id}`}
              className="flex-shrink-0 w-40 sm:w-48"
            >
              <div className={`card ${isDark ? 'card-dark' : ''} h-full`}>
                <div className={`h-24 sm:h-28 rounded-lg mb-3 flex items-center justify-center ${
                  index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                  index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                  'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                  <span className="text-2xl text-white">📚</span>
                </div>
                
                <h3 className={`font-semibold text-sm line-clamp-2 mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {library.name}
                </h3>
                
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-1`}>
                  📍 {library.area}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-yellow-500 text-xs">⭐ 4.2</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                  }`}>
                    Open
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LibrarySlider;