import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import ProfileDropdown from './ProfileDropdown';
import toast from 'react-hot-toast';
import axios from '../utils/axios';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [offers, setOffers] = useState([]);
  const [showOffers, setShowOffers] = useState(false);
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Secret key combination: Ctrl+Shift+S for Super Admin
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        if (user?.role === 'superadmin') {
          navigate('/superadmin');
          toast.success('🔐 Super Admin Access Granted!');
        } else {
          toast.error('🚫 Access Denied - Super Admin Only!');
        }
      }
      // Secret key combination: Ctrl+Shift+A for Admin
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        if (user?.role === 'admin') {
          navigate('/admin');
          toast.success('🔑 Admin Panel Access Granted!');
        } else {
          toast.error('🚫 Access Denied - Admin Only!');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user, navigate]);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get('/api/offers/public-offers');
      setOffers(response.data.slice(0, 3) || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className={`shadow-lg sticky top-0 z-50 transition-all duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">📖</span>
            </div>
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              LibraryBook
            </span>
          </Link>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🏠 Home
            </Link>
            <Link to="/libraries" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              🏢 Libraries
            </Link>
            <Link to="/books" className={`font-medium transition-colors ${
              isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
            }`}>
              📚 Books
            </Link>
            {user && user.role === 'user' && (
              <Link to="/dashboard" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                📋 Dashboard
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                🔑 Admin Panel
              </Link>
            )}
            {user?.role === 'superadmin' && (
              <Link to="/superadmin" className={`font-medium transition-colors ${
                isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
              }`}>
                👑 Super Admin
              </Link>
            )}
            <div className="relative">
              <button 
                onMouseEnter={() => setShowOffers(true)}
                onMouseLeave={() => setShowOffers(false)}
                className={`font-medium transition-colors ${
                  isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                🎁 Offers
              </button>
              {showOffers && (
                <div 
                  onMouseEnter={() => setShowOffers(true)}
                  onMouseLeave={() => setShowOffers(false)}
                  className={`absolute top-full left-0 mt-2 w-80 rounded-lg shadow-lg border z-50 ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="p-4">
                    <h3 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      🔥 Hot Offers
                    </h3>
                    {offers.length > 0 ? (
                      <div className="space-y-3">
                        {offers.map((offer) => (
                          <div key={offer._id} className={`p-3 rounded-lg ${
                            isDark ? 'bg-gray-700' : 'bg-gray-50'
                          }`}>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {offer.title}
                              </h4>
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {offer.discount}% OFF
                              </span>
                            </div>
                            <p className={`text-xs mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {offer.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <code className={`text-xs px-2 py-1 rounded ${
                                isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
                              }`}>
                                {offer.code}
                              </code>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(offer.code);
                                  toast.success('Code copied!');
                                }}
                                className="text-xs text-blue-500 hover:text-blue-600"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        ))}
                        <Link 
                          to="/offers"
                          className="block text-center text-blue-500 hover:text-blue-600 text-sm font-medium mt-3"
                        >
                          View All Offers →
                        </Link>
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        No offers available
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <ProfileDropdown />
            ) : (
              <div className="flex space-x-3">
                <Link 
                  to="/login" 
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-medium transition-all transform hover:scale-105"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;