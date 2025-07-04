import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { FiSearch, FiMapPin, FiFilter, FiX, FiWifi, FiCoffee, FiAirplay, FiBookOpen, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

// Sample data (would come from API in production)
const librariesData = [
  {
    id: 1,
    name: 'Central City Library',
    address: '123 Main St, Downtown',
    city: 'New York',
    area: 'Downtown',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
    facilities: ['WiFi', 'AC', 'Cafe', 'Study Rooms'],
    openingHours: '9:00 AM - 8:00 PM',
    rating: 4.8,
    reviewsCount: 124,
    distance: '0.5 miles',
  },
  {
    id: 2,
    name: 'Riverside Reading Hub',
    address: '456 River Rd, Westside',
    city: 'New York',
    area: 'Westside',
    image: 'https://images.unsplash.com/photo-1568667256549-094345857637',
    facilities: ['WiFi', 'Study Rooms', 'Printing', 'Conference Rooms'],
    openingHours: '8:00 AM - 6:00 PM',
    rating: 4.5,
    reviewsCount: 89,
    distance: '1.2 miles',
  },
  {
    id: 3,
    name: 'Northside Knowledge Center',
    address: '789 North Ave, Northside',
    city: 'New York',
    area: 'Northside',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    facilities: ['WiFi', 'AC', 'Conference Rooms', 'Children Area'],
    openingHours: '10:00 AM - 7:00 PM',
    rating: 4.3,
    reviewsCount: 56,
    distance: '2.0 miles',
  },
  {
    id: 4,
    name: 'Eastside Educational Library',
    address: '101 East Blvd, Eastside',
    city: 'Boston',
    area: 'Eastside',
    image: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc',
    facilities: ['WiFi', 'Study Rooms', 'Multimedia', 'Printing'],
    openingHours: '9:00 AM - 9:00 PM',
    rating: 4.7,
    reviewsCount: 112,
    distance: '0.8 miles',
  },
  {
    id: 5,
    name: 'Community Learning Center',
    address: '222 Community Dr, Midtown',
    city: 'Boston',
    area: 'Midtown',
    image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570',
    facilities: ['WiFi', 'AC', 'Cafe', 'Children Area', 'Quiet Zones'],
    openingHours: '8:30 AM - 7:30 PM',
    rating: 4.6,
    reviewsCount: 94,
    distance: '1.5 miles',
  },
  {
    id: 6,
    name: 'Sunset Library & Research Center',
    address: '333 Sunset Ave, Westside',
    city: 'Chicago',
    area: 'Westside',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
    facilities: ['WiFi', 'Study Rooms', 'Research Materials', 'Printing', 'AC'],
    openingHours: '10:00 AM - 8:00 PM',
    rating: 4.9,
    reviewsCount: 138,
    distance: '0.3 miles',
  },
];

// Icons for different facilities
const facilityIcons = {
  'WiFi': <FiWifi />,
  'AC': <FiAirplay />,
  'Cafe': <FiCoffee />,
  'Study Rooms': <FiBookOpen />,
  'Printing': <FiBookOpen />,
  'Conference Rooms': <FiBookOpen />,
  'Children Area': <FiBookOpen />,
  'Quiet Zones': <FiBookOpen />,
  'Multimedia': <FiBookOpen />,
  'Research Materials': <FiBookOpen />,
};

const Libraries = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [libraries, setLibraries] = useState(librariesData);

  // Get unique cities and areas from data
  const cities = [...new Set(librariesData.map(lib => lib.city))];
  const areas = [...new Set(librariesData.map(lib => lib.area))];
  
  // Get unique facilities from data
  const allFacilities = [...new Set(librariesData.flatMap(lib => lib.facilities))];

  // Filter libraries based on search and filters
  useEffect(() => {
    let filtered = librariesData;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(lib => 
        lib.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lib.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lib.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lib.area.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity) {
      filtered = filtered.filter(lib => lib.city === selectedCity);
    }

    // Filter by area
    if (selectedArea) {
      filtered = filtered.filter(lib => lib.area === selectedArea);
    }

    // Filter by facilities
    if (selectedFacilities.length > 0) {
      filtered = filtered.filter(lib => 
        selectedFacilities.every(facility => lib.facilities.includes(facility))
      );
    }

    setLibraries(filtered);
  }, [searchTerm, selectedCity, selectedArea, selectedFacilities]);

  // Toggle facility selection
  const toggleFacility = (facility) => {
    setSelectedFacilities(prev => 
      prev.includes(facility)
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCity('');
    setSelectedArea('');
    setSelectedFacilities([]);
  };

  return (
    <>
      <Head>
        <title>Libraries | LibraryBooking</title>
        <meta name="description" content="Browse and book seats at libraries near you" />
      </Head>

      <div className="bg-gray-50 min-h-screen">
        {/* Hero Section */}
        <div className="bg-primary-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-4">Find Your Perfect Library</h1>
            <p className="text-lg mb-8 max-w-2xl">
              Browse through our collection of libraries and find the perfect spot for reading, studying, or working
            </p>

            {/* Search Bar */}
            <div className="flex items-center">
              <div className="relative flex-grow max-w-3xl">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
                  placeholder="Search libraries by name, location, or facilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="bg-white text-primary-700 hover:bg-gray-100 px-6 py-3 rounded-r-md flex items-center font-medium"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FiFilter className="mr-2" />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="bg-white shadow-md py-6 border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Filters</h2>
                <button
                  onClick={clearFilters}
                  className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                >
                  Clear All Filters <FiX className="ml-1" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* City Filter */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <select
                    id="city"
                    className="form-input w-full"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <option value="">All Cities</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Area Filter */}
                <div>
                  <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                    Area
                  </label>
                  <select
                    id="area"
                    className="form-input w-full"
                    value={selectedArea}
                    onChange={(e) => setSelectedArea(e.target.value)}
                  >
                    <option value="">All Areas</option>
                    {areas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <select
                    id="sortBy"
                    className="form-input w-full"
                    defaultValue="rating"
                  >
                    <option value="rating">Rating (High to Low)</option>
                    <option value="distance">Distance (Near to Far)</option>
                    <option value="name">Name (A to Z)</option>
                  </select>
                </div>
              </div>

              {/* Facilities Filter */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Facilities</h3>
                <div className="flex flex-wrap gap-2">
                  {allFacilities.map(facility => (
                    <button
                      key={facility}
                      onClick={() => toggleFacility(facility)}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${
                        selectedFacilities.includes(facility)
                          ? 'bg-primary-100 text-primary-800 border border-primary-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">
                        {facilityIcons[facility] || <FiBookOpen />}
                      </span>
                      {facility}
                      {selectedFacilities.includes(facility) && (
                        <FiX className="ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Libraries List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {libraries.length} {libraries.length === 1 ? 'Library' : 'Libraries'} Found
            </h2>
          </div>

          {/* Grid of Libraries */}
          {libraries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {libraries.map((library) => (
                <motion.div
                  key={library.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-lg shadow-card overflow-hidden"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={library.image}
                      alt={library.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority={library.id <= 3}
                    />
                    <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium text-gray-700 shadow-sm">
                      {library.distance}
                    </div>
                  </div>

                  
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold">{library.name}</h3>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">★</span>
                        <span className="text-sm font-medium">{library.rating}</span>
                        <span className="text-gray-400 text-xs ml-1">({library.reviewsCount})</span>
                      </div>
                    </div>
                    
                    <p className="flex items-center text-gray-500 text-sm mb-3">
                      <FiMapPin className="mr-1" /> {library.address}
                    </p>
                    
                    <p className="text-sm mb-3">
                      <span className="font-medium">Hours:</span> {library.openingHours}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {library.facilities.slice(0, 3).map((facility) => (
                        <span 
                          key={facility} 
                          className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded flex items-center"
                        >
                          <span className="mr-1">
                            {facilityIcons[facility] || <FiBookOpen />}
                          </span>
                          {facility}
                        </span>
                      ))}
                      {library.facilities.length > 3 && (
                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                          +{library.facilities.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link 
                        href={`/libraries/${library.id}`}
                        className="flex-1 btn btn-primary text-center"
                      >
                        View Details
                      </Link>
                      <Link 
                        href={`/libraries/${library.id}/seats`}
                        className="flex-1 btn btn-outline text-center"
                      >
                        Book Seats
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No libraries found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
              <button
                onClick={clearFilters}
                className="btn btn-primary"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Libraries;