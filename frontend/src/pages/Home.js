import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const Home = () => {
  const [allLibraries, setAllLibraries] = useState([]);
  const { isDark } = useTheme();

  useEffect(() => {
    // Get all libraries
    const fetchLibraries = async () => {
      try {
        const response = await axios.get('/api/libraries');
        setAllLibraries(response.data || []);
      } catch (error) {
        console.log('Error fetching libraries');
      }
    };

    fetchLibraries();
  }, []);



  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>


      {/* Search Bar */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for Libraries, Books, Areas..."
                className={`w-full px-4 py-3 pl-12 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select className={`px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}>
              <option>Mumbai</option>
              <option>Delhi</option>
              <option>Bangalore</option>
              <option>Chennai</option>
              <option>Pune</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative h-96 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-5xl font-bold mb-4">
              Discover Your Perfect Reading Space
            </h1>
            <p className="text-xl mb-6">
              Find libraries, reserve seats, and immerse yourself in knowledge
            </p>
            <Link 
              to="/libraries"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-lg inline-block"
            >
              Explore Libraries
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 py-4">
            <button className={`border-b-2 border-blue-600 pb-2 font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              📚 All Libraries
            </button>
            <button className={`pb-2 font-semibold transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'
            }`}>
              ⭐ Popular
            </button>
            <button className={`pb-2 font-semibold transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'
            }`}>
              🆕 Recently Added
            </button>
            <button className={`pb-2 font-semibold transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'
            }`}>
              🏆 Top Rated
            </button>
          </div>
        </div>
      </div>

      {/* Libraries Section */}
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📖 Featured Libraries
            </h2>
            <Link to="/libraries" className={`font-semibold ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
              View All →
            </Link>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {allLibraries.slice(0, 8).map((library, index) => (
              <div key={library._id} className={`rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className={`h-48 flex items-center justify-center ${
                  index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                  index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                  'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                  <span className="text-4xl text-white">📚</span>
                </div>
                <div className="p-4">
                  <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {library.name}
                  </h3>
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 {library.area}, {library.city}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-yellow-500">⭐</span>
                      <span className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        4.{Math.floor(Math.random() * 5) + 3}
                      </span>
                    </div>
                    <Link 
                      to={`/libraries/${library._id}`}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all transform hover:scale-105"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className={`py-16 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="container mx-auto px-4">
          <h2 className={`text-3xl font-bold text-center mb-12 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Why Choose LibraryBook?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🎯</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Easy Booking
              </h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Book your seat in just a few clicks with real-time availability
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">📍</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Smart Search
              </h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Find libraries by location, facilities, and availability
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-pink-500 to-red-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">💳</span>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Secure Payment
              </h3>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Safe and secure payment options with instant confirmation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;