import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import OfferBanner from '../components/OfferBanner';
import LibrarySlider from '../components/LibrarySlider';
import MobileHomeHeader from '../components/MobileHomeHeader';
import MobileQuickActions from '../components/MobileQuickActions';
import MobileLibraryFilters from '../components/MobileLibraryFilters';

const Home = () => {
  const [allLibraries, setAllLibraries] = useState([]);
  const [filteredLibraries, setFilteredLibraries] = useState([]);
  const [nearbyLibraries, setNearbyLibraries] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedCity, setSelectedCity] = useState('Mumbai');
  const { isDark } = useTheme();

  useEffect(() => {
    // Get user location
    const getUserLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.log('Location access denied, using city filter');
          }
        );
      }
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    // Fetch libraries based on location or city
    const fetchLibraries = async () => {
      try {
        let response;
        if (userLocation) {
          // Use nearby API with user location
          response = await axios.get(`/api/libraries/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=25&city=${selectedCity}`);
          setNearbyLibraries(response.data || []);
        } else {
          // Use city filter
          response = await axios.get(`/api/libraries?city=${selectedCity}`);
        }
        
        const libraries = response.data || [];
        setAllLibraries(libraries);
        setFilteredLibraries(libraries);
      } catch (error) {
        console.log('Error fetching libraries');
      }
    };

    fetchLibraries();
  }, [userLocation, selectedCity]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    
    let filtered = [...allLibraries];
    
    switch(filter) {
      case 'popular':
        // Sort by a popularity metric (using random for demo)
        filtered = filtered.sort(() => Math.random() - 0.5).slice(0, 6);
        break;
      case 'recent':
        // Sort by creation date (newest first)
        filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'rated':
        // Sort by rating (using random rating for demo)
        filtered = filtered.sort(() => Math.random() - 0.5);
        break;
      default:
        // Show all libraries
        filtered = allLibraries;
    }
    
    setFilteredLibraries(filtered);
  };

  // Get popular libraries
  const popularLibraries = [...allLibraries].sort(() => Math.random() - 0.5).slice(0, 6);
  
  // Get recent libraries
  const recentLibraries = [...allLibraries].sort((a, b) => 
    new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now())
  ).slice(0, 6);
  
  // Get top rated libraries
  const topRatedLibraries = [...allLibraries].sort(() => Math.random() - 0.5).slice(0, 6);

  return (
    <div className={`min-h-screen transition-all duration-300 pb-16 md:pb-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Home Header */}
      <MobileHomeHeader />
      
      {/* Mobile Quick Actions */}
      <MobileQuickActions />
      
      {/* Mobile Offer Banner */}
      <div className="md:hidden">
        <OfferBanner />
      </div>


      {/* Search Bar - Only for desktop */}
      <div className={`shadow-lg hidden md:block ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="mobile-container py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for Libraries, Books, Areas..."
                className={`input-field pl-12 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={`input-field w-auto ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hero Banner - Hidden on mobile */}
      <div className="hidden md:block relative h-96 bg-gradient-to-r from-red-500 to-pink-500 overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-30"></div>
        <div className="relative z-10 mobile-container h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-3xl lg:text-5xl font-bold mb-4">
              Discover Your Perfect Reading Space
            </h1>
            <p className="text-lg lg:text-xl mb-6">
              Find libraries, reserve seats, and immerse yourself in knowledge
            </p>
            <Link 
              to="/libraries"
              className="btn-primary"
            >
              Explore Libraries
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Hidden on mobile */}
      <div className={`hidden md:block border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="mobile-container">
          <div className="flex space-x-8 py-4">
            <button 
              onClick={() => handleFilterChange('all')}
              className={`pb-2 font-semibold transition-colors ${
                activeFilter === 'all'
                  ? `border-b-2 border-red-500 ${isDark ? 'text-red-500' : 'text-red-500'}`
                  : `${isDark ? 'text-gray-300 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`
              }`}
            >
              📚 All Libraries
            </button>
            <button 
              onClick={() => handleFilterChange('popular')}
              className={`pb-2 font-semibold transition-colors ${
                activeFilter === 'popular'
                  ? `border-b-2 border-red-500 ${isDark ? 'text-red-500' : 'text-red-500'}`
                  : `${isDark ? 'text-gray-300 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`
              }`}
            >
              ⭐ Popular
            </button>
            <button 
              onClick={() => handleFilterChange('recent')}
              className={`pb-2 font-semibold transition-colors ${
                activeFilter === 'recent'
                  ? `border-b-2 border-red-500 ${isDark ? 'text-red-500' : 'text-red-500'}`
                  : `${isDark ? 'text-gray-300 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`
              }`}
            >
              🆕 Recently Added
            </button>
            <button 
              onClick={() => handleFilterChange('rated')}
              className={`pb-2 font-semibold transition-colors ${
                activeFilter === 'rated'
                  ? `border-b-2 border-red-500 ${isDark ? 'text-red-500' : 'text-red-500'}`
                  : `${isDark ? 'text-gray-300 hover:text-red-500' : 'text-gray-600 hover:text-red-500'}`
              }`}
            >
              🏆 Top Rated
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Library Filters */}
      <div className="md:hidden">
        <MobileLibraryFilters activeFilter={activeFilter} setActiveFilter={handleFilterChange} />
      </div>
      
      {/* Mobile Library Sections */}
      <div className="md:hidden space-y-4 pb-6">
        {/* Libraries Near You */}
        <div>
          <LibrarySlider 
            libraries={userLocation ? nearbyLibraries : filteredLibraries} 
            title={userLocation ? "📍 Libraries Near You" : `📖 Libraries in ${selectedCity}`} 
          />
        </div>
        
        {/* Popular Libraries */}
        <div>
          <LibrarySlider 
            libraries={popularLibraries} 
            title="⭐ Popular" 
          />
        </div>
        
        {/* Recently Added Libraries */}
        <div>
          <LibrarySlider 
            libraries={recentLibraries} 
            title="🆕 Recently Added" 
          />
        </div>
        
        {/* Top Rated Libraries */}
        <div>
          <LibrarySlider 
            libraries={topRatedLibraries} 
            title="🏆 Top Rated" 
          />
        </div>
      </div>
      
      {/* Desktop/Tablet Libraries Grid */}
      <div className="hidden md:block py-6 sm:py-8">
        <div className="mobile-container">
          <div className="flex items-center justify-between mb-6">
            <h2 className={`mobile-heading ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📖 {activeFilter === 'all' ? 'Featured Libraries' :
                   activeFilter === 'popular' ? 'Popular Libraries' :
                   activeFilter === 'recent' ? 'Recently Added Libraries' :
                   'Top Rated Libraries'}
            </h2>
            <Link to="/libraries" className={`font-semibold ${isDark ? 'text-red-500 hover:text-red-400' : 'text-red-500 hover:text-red-600'}`}>
              View All →
            </Link>
          </div>
          <div className="responsive-grid">
            {filteredLibraries.slice(0, 8).map((library, index) => (
              <div key={library._id} className={`card ${isDark ? 'card-dark' : ''} animate-fadeInUp`} style={{animationDelay: `${index * 0.1}s`}}>
                <div className={`h-40 sm:h-48 flex items-center justify-center rounded-lg mb-4 ${
                  index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                  index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                  'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                  <span className="text-3xl sm:text-4xl text-white">📚</span>
                </div>
                <div className="space-y-3">
                  <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-gray-800'} line-clamp-2`}>
                    {library.name}
                  </h3>
                  <p className={`mobile-text ${isDark ? 'text-gray-400' : 'text-gray-600'} line-clamp-1`}>
                    📍 {library.area}, {library.city}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center">
                      <span className="text-yellow-500">⭐</span>
                      <span className={`text-xs sm:text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        4.{Math.floor(Math.random() * 5) + 3}
                      </span>
                    </div>
                    <Link 
                      to={`/libraries/${library._id}`}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all transform hover:scale-105"
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

      {/* Features Section - Hidden on mobile */}
      <div className={`hidden md:block py-16 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="mobile-container">
          <h2 className={`mobile-heading text-center mb-12 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Why Choose LibraryBook?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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