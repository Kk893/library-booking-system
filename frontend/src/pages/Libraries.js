import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from '../utils/axios';
import { MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl, handleImageError } from '../utils/imageUtils';
import MobileLibraryCard from '../components/MobileLibraryCard';


const Libraries = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryLibraryName, setGalleryLibraryName] = useState('');
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

  const openGallery = (images, libraryName, startIndex = 0) => {
    setGalleryImages(images);
    setGalleryLibraryName(libraryName);
    setCurrentImageIndex(startIndex);
    setShowGallery(true);
  };

  const closeGallery = () => {
    setShowGallery(false);
    setGalleryImages([]);
    setCurrentImageIndex(0);
    setGalleryLibraryName('');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <div className={`min-h-screen transition-all duration-300 pb-16 md:pb-0 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="mobile-container py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className={`mobile-heading ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🏢 Discover Libraries
              </h1>
              {userLocation && nearbyLibraries && nearbyLibraries.length > 0 && !searchTerm && !selectedCity && (
                <p className={`text-xs sm:text-sm ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  📍 Showing {nearbyLibraries.length} libraries near your current location
                </p>
              )}
              {!userLocation && (
                <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  📍 Enable location to see nearby libraries
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="mobile-container py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search libraries, areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 sm:py-3 pl-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={`px-3 py-2 sm:py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${
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

      <div className="mobile-container py-4 sm:py-8">
        {/* Mobile Libraries List */}
        <div className="md:hidden">
          {displayLibraries?.map((library, index) => (
            <MobileLibraryCard key={library._id} library={library} index={index} />
          ))}
        </div>

        {/* Desktop Libraries Grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayLibraries?.map((library, index) => (
            <div
              key={library._id}
              id={`library-${library._id}`}
              className={`rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 ${
                isDark ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className={`h-48 flex items-center justify-center relative overflow-hidden ${
                index % 4 === 0 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                index % 4 === 2 ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                'bg-gradient-to-br from-orange-500 to-red-500'
              }`}>
                {library.images && library.images.length > 0 ? (
                  <>
                    <img 
                      src={getImageUrl(library.images[0])}
                      alt={library.name}
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-110"
                      onClick={() => openGallery(library.images, library.name, 0)}
                      onError={handleImageError}
                    />
                    {library.images.length > 1 && (
                      <>
                        <button
                          onClick={() => openGallery(library.images, library.name, 0)}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs hover:bg-opacity-70 transition-all"
                        >
                          📷 {library.images.length} Photos
                        </button>
                        <div className="absolute bottom-2 left-2 flex space-x-1">
                          {library.images.slice(0, 4).map((_, imgIndex) => (
                            <div
                              key={imgIndex}
                              className={`w-2 h-2 rounded-full ${
                                imgIndex === 0 ? 'bg-white' : 'bg-white bg-opacity-50'
                              }`}
                            />
                          ))}
                          {library.images.length > 4 && (
                            <div className="w-2 h-2 rounded-full bg-white bg-opacity-30" />
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-4xl text-white">📚</span>
                  </div>
                )}
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
                <div className="space-y-3">
                  {library.images && library.images.length > 0 && (
                    <button
                      onClick={() => openGallery(library.images, library.name, 0)}
                      className={`w-full text-center py-2 px-3 rounded-lg border transition-all hover:scale-105 ${
                        isDark 
                          ? 'border-gray-600 text-blue-400 hover:bg-gray-700' 
                          : 'border-gray-300 text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      🖼️ View Gallery ({library.images.length} images)
                    </button>
                  )}
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

      {/* Image Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeGallery}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center"
            >
              ✕
            </button>
            
            {/* Library Name */}
            <div className="absolute top-4 left-4 text-white z-10">
              <h3 className="text-lg font-semibold bg-black bg-opacity-50 px-3 py-1 rounded">
                {galleryLibraryName}
              </h3>
            </div>
            
            {/* Previous Button */}
            {galleryImages.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 text-white text-3xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ‹
              </button>
            )}
            
            {/* Image */}
            <img
              src={getImageUrl(galleryImages[currentImageIndex])}
              alt={`${galleryLibraryName} ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onError={handleImageError}
            />
            
            {/* Next Button */}
            {galleryImages.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 text-white text-3xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
              >
                ›
              </button>
            )}
            
            {/* Image Counter */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                {currentImageIndex + 1} / {galleryImages.length}
              </div>
            )}
            
            {/* Thumbnail Strip */}
            {galleryImages.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-xs overflow-x-auto bg-black bg-opacity-30 p-2 rounded">
                {galleryImages.map((image, index) => (
                  <img
                    key={index}
                    src={getImageUrl(image)}
                    alt={`Thumbnail ${index + 1}`}
                    className={`w-12 h-12 object-cover rounded cursor-pointer transition-all ${
                      index === currentImageIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                    onError={handleImageError}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Libraries;