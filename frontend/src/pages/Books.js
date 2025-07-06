import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import OfferModal from '../components/OfferModal';
import axios from 'axios';
import toast from 'react-hot-toast';

const Books = () => {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showOffers, setShowOffers] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
    fetchLibraries();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get('/api/books');
      setBooks(response.data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraries = async () => {
    try {
      const response = await axios.get('/api/libraries');
      setLibraries(response.data || []);
    } catch (error) {
      console.error('Error fetching libraries:', error);
    }
  };

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = !selectedGenre || book.genre === selectedGenre;
    const matchesLibrary = !selectedLibrary || book.libraryId?._id === selectedLibrary;
    return matchesSearch && matchesGenre && matchesLibrary && book.availableCopies > 0;
  });

  const genres = [...new Set(books.map(book => book.genre))];

  const handleBookSelect = (book) => {
    if (!user) {
      toast.error('Please login to reserve books');
      navigate('/login');
      return;
    }

    if (selectedBooks.find(b => b._id === book._id)) {
      setSelectedBooks(selectedBooks.filter(b => b._id !== book._id));
      toast.success('Book removed from selection');
    } else {
      if (selectedBooks.length >= 5) {
        toast.error('Maximum 5 books can be selected');
        return;
      }
      setSelectedBooks([...selectedBooks, book]);
      toast.success('Book added to selection');
    }
  };

  const handleReserveBooks = () => {
    if (selectedBooks.length === 0) {
      toast.error('Please select at least one book');
      return;
    }
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    setBookingLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Create booking for each selected book
      const bookingPromises = selectedBooks.map(book => {
        const bookingData = {
          libraryId: book.libraryId._id,
          type: 'book',
          bookId: book._id,
          date: selectedDate,
          amount: 0, // Books are free
          status: 'confirmed',
          paymentId: 'book_' + Date.now()
        };
        
        return axios.post('/api/user/bookings', bookingData, { headers });
      });
      
      await Promise.all(bookingPromises);
      
      toast.success(`🎉 ${selectedBooks.length} book(s) reserved successfully!`);
      setShowBookingModal(false);
      setSelectedBooks([]);
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleApplyOffer = (offer) => {
    setAppliedOffer(offer);
    toast.success('Offer applied! (Books are free, but you get priority access)');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Books...</p>
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
                📚 Browse Books
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Discover and reserve books from all libraries
              </p>
            </div>
            {selectedBooks.length > 0 && (
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                  <span className="text-sm font-semibold">{selectedBooks.length} books selected</span>
                </div>
                <button
                  onClick={handleReserveBooks}
                  className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  📚 Reserve Selected Books
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="container mx-auto px-6 py-4">
          <div className="grid md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="🔍 Search books or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
              }`}
            />
            
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            
            <select
              value={selectedLibrary}
              onChange={(e) => setSelectedLibrary(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            >
              <option value="">All Libraries</option>
              {libraries.map(library => (
                <option key={library._id} value={library._id}>{library.name}</option>
              ))}
            </select>

            <button
              onClick={() => setShowOffers(true)}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all"
            >
              🎁 View Offers
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Books Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => {
            const isSelected = selectedBooks.find(b => b._id === book._id);
            
            return (
              <div
                key={book._id}
                onClick={() => handleBookSelect(book)}
                className={`cursor-pointer rounded-xl shadow-lg overflow-hidden transition-all transform hover:scale-105 ${
                  isSelected 
                    ? 'ring-4 ring-green-500 bg-green-50 dark:bg-green-900/20' 
                    : isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* Book Cover */}
                <div className={`h-48 flex items-center justify-center relative ${
                  book.genre === 'Programming' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                  book.genre === 'Technology' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  book.genre === 'Self-Help' ? 'bg-gradient-to-br from-green-500 to-teal-500' :
                  'bg-gradient-to-br from-orange-500 to-red-500'
                }`}>
                  <span className="text-4xl text-white">📖</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                </div>
                
                {/* Book Details */}
                <div className="p-4">
                  <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {book.title}
                  </h3>
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    by {book.author}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      book.genre === 'Programming' ? 'bg-blue-100 text-blue-800' :
                      book.genre === 'Technology' ? 'bg-purple-100 text-purple-800' :
                      book.genre === 'Self-Help' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {book.genre}
                    </span>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {book.language}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        📍 {book.libraryId?.name}
                      </p>
                      <p className="text-xs text-green-500 font-semibold">
                        {book.availableCopies} copies available
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-500">FREE</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Reserve now
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No books found
            </p>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Try adjusting your search criteria
            </p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📚 Reserve Books
            </h3>
            
            <div className="space-y-6">
              {/* Selected Books */}
              <div>
                <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Selected Books ({selectedBooks.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedBooks.map((book) => (
                    <div key={book._id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {book.title}
                          </p>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            by {book.author} • {book.libraryId?.name}
                          </p>
                        </div>
                        <button
                          onClick={() => handleBookSelect(book)}
                          className="text-red-500 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Reservation Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>

              {/* Offers Section */}
              <div className={`p-4 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    Total Books: {selectedBooks.length}
                  </span>
                  <span className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                    FREE
                  </span>
                </div>
                {appliedOffer && (
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <p className={`text-sm ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                      🎁 {appliedOffer.title} applied - Priority reservation!
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowOffers(true)}
                  className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-2 rounded-lg font-semibold transition-all"
                >
                  🎁 Apply Offers for Priority Access
                </button>
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                onClick={handleBookingSubmit}
                disabled={bookingLoading}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {bookingLoading ? 'Reserving...' : 'Reserve Books'}
              </button>
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-500 text-white py-3 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offers Modal */}
      <OfferModal
        isOpen={showOffers}
        onClose={() => setShowOffers(false)}
        onApplyOffer={handleApplyOffer}
        totalAmount={0}
      />
    </div>
  );
};

export default Books;