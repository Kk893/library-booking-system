import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';
import { getImageUrl, handleImageError } from '../utils/imageUtils';

const BookCard = ({ book, onReserve }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && book._id) {
      checkFavoriteStatus();
    }
  }, [user, book._id]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await axios.get(`/api/favorites/check/${book._id}`);
      setIsFavorite(response.data.isFavorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to add favorites');
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        await axios.delete(`/api/favorites/remove/${book._id}`);
        toast.success('💔 Removed from favorites');
        setIsFavorite(false);
      } else {
        await axios.post(`/api/favorites/add/${book._id}`);
        toast.success('❤️ Added to favorites');
        setIsFavorite(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl shadow-lg overflow-hidden transition-all transform hover:scale-105 ${
      isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="relative">
        <div className={`h-48 flex items-center justify-center ${
          book.genre === 'Fiction' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
          book.genre === 'Science' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
          book.genre === 'History' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
          'bg-gradient-to-br from-green-500 to-teal-500'
        }`}>
          {book.coverImage ? (
            <img 
              src={getImageUrl(book.coverImage)}
              alt={book.title}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          ) : null}
          
          {/* Fallback icon */}
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ display: book.coverImage ? 'none' : 'flex' }}
          >
            <span className="text-4xl text-white">📚</span>
          </div>
        </div>
        
        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          disabled={loading}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isFavorite 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white/80 hover:bg-white text-gray-600 hover:text-red-500'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
        >
          {loading ? '⏳' : isFavorite ? '❤️' : '🤍'}
        </button>

        {/* Availability Badge */}
        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${
          book.availableCopies > 0 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {book.availableCopies > 0 ? `${book.availableCopies} Available` : 'Not Available'}
        </div>
      </div>

      <div className="p-4">
        <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {book.title}
        </h3>
        
        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          by {book.author}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
          }`}>
            {book.genre}
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            ISBN: {book.isbn}
          </span>
        </div>

        {book.description && (
          <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {book.description}
          </p>
        )}

        <div className="flex space-x-2">
          <button
            onClick={() => onReserve && onReserve(book)}
            disabled={book.availableCopies === 0}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
              book.availableCopies > 0
                ? 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {book.availableCopies > 0 ? '📚 Reserve' : '❌ Unavailable'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookCard;