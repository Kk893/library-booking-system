import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from '../utils/axios';
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';


const Libraries = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const [userLocation, setUserLocation] = useState(null);
  const { isDark } = useTheme();

  // Get user location on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
        },
        () => {
          console.log('Location access denied');
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  const { data: libraries, isLoading } = useQuery(
    ['libraries', searchTerm, selectedCity],
    () => axios.get(`/api/libraries?search=${searchTerm}&city=${selectedCity}`).then(res => res.data)
  );

  // Get nearby libraries based on user location
  const { data: nearbyLibraries } = useQuery(
    ['nearby-libraries-main', userLocation],
    async () => {
      if (!userLocation) return [];
      try {
        const response = await axios.get(`/api/libraries/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=25`);
        return response.data || [];
      } catch (error) {
        return [];
      }
    },
    { 
      enabled: !!userLocation,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 300000
    }
  );

  // Show location-based libraries first, then all libraries
  const displayLibraries = nearbyLibraries && nearbyLibraries.length > 0 && !searchTerm && !selectedCity 
    ? nearbyLibraries 
    : libraries;

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🏢 Discover Libraries
              </h1>
              {userLocation && nearbyLibraries && nearbyLibraries.length > 0 && !searchTerm && !selectedCity && (
                <p className={`text-sm mt-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  📍 Showing {nearbyLibraries.length} libraries near your current location
                </p>
              )}
              {!userLocation && (
                <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  📍 Enable location to see nearby libraries
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search libraries, areas, or facilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={`px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">All Cities</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">


        {/* Libraries Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayLibraries?.map((library, index) => (
            <div
              key={library._id}
              id={`library-${library._id}`}
              className={`rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className={`h-48 flex items-center justify-center ${
                index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                <span className="text-4xl text-white">📚</span>
              </div>
              <div className="p-6">
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {library.name}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <MapPinIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {library.area}, {library.city}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {library.openingHours?.open} - {library.openingHours?.close}
                    </span>
                  </div>
                  {library.distance && (
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        📏 {library.distance} km away
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-yellow-500">⭐</span>
                    <span className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {library.averageRating > 0 ? library.averageRating : 'No ratings'} ({library.totalRatings || 0})
                    </span>
                  </div>
                  <Link
                    to={`/libraries/${library._id}`}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayLibraries?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No libraries found
            </p>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Try adjusting your search criteria or location
            </p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading libraries...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Libraries;