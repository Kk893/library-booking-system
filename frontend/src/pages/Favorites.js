import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const Favorites = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('/api/favorites/my-favorites');
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleReserveBook = (book) => {
    navigate(`/libraries/${book.libraryId._id}`, { 
      state: { selectedBook: book } 
    });
  };

  const handleRemoveFavorite = async (bookId) => {
    try {
      await axios.delete(`/api/favorites/remove/${bookId}`);
      toast.success('💔 Removed from favorites');
      fetchFavorites(); // Refresh the list
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                ❤️ My Favorite Books
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Your personal collection of favorite books
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'}`}>
              <span className="text-sm font-semibold">{favorites.length} Favorites</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💔</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No favorite books yet
            </p>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Start exploring libraries and add books to your favorites
            </p>
            <button
              onClick={() => navigate('/libraries')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
            >
              📚 Explore Libraries
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500 mb-2">{favorites.length}</div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Favorites</div>
                </div>
              </div>
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500 mb-2">
                    {favorites.filter(f => f.bookId.availableCopies > 0).length}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available Now</div>
                </div>
              </div>
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500 mb-2">
                    {[...new Set(favorites.map(f => f.bookId.genre))].length}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Genres</div>
                </div>
              </div>
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-500 mb-2">
                    {[...new Set(favorites.map(f => f.libraryId._id))].length}
                  </div>
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Libraries</div>
                </div>
              </div>
            </div>

            {/* Favorites Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map((favorite) => (
                <div key={favorite._id} className="relative">
                  <BookCard 
                    book={favorite.bookId} 
                    onReserve={handleReserveBook}
                  />
                  
                  {/* Library Info */}
                  <div className={`mt-2 p-2 rounded-lg text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    <div className="flex items-center justify-between">
                      <span>📍 {favorite.libraryId.name}</span>
                      <button
                        onClick={() => handleRemoveFavorite(favorite.bookId._id)}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        title="Remove from favorites"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="text-xs opacity-75">
                      {favorite.libraryId.area}, {favorite.libraryId.city}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Genre Filter */}
            <div className={`mt-8 p-6 rounded-2xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                📊 Your Reading Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...new Set(favorites.map(f => f.bookId.genre))].map((genre) => {
                  const count = favorites.filter(f => f.bookId.genre === genre).length;
                  return (
                    <div
                      key={genre}
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {genre} ({count})
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Favorites;