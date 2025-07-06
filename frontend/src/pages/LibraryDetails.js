import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const LibraryDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [library, setLibrary] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingType, setBookingType] = useState('seat');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchLibraryDetails();
    fetchLibraryBooks();
  }, [id]);

  const fetchLibraryDetails = async () => {
    try {
      const response = await axios.get(`/api/libraries/${id}`);
      setLibrary(response.data);
    } catch (error) {
      console.error('Error fetching library:', error);
      toast.error('Library not found');
      navigate('/libraries');
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryBooks = async () => {
    try {
      const response = await axios.get(`/api/books?libraryId=${id}`);
      setBooks(response.data || []);
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleBookNow = (type = 'seat') => {
    if (!user) {
      toast.error('Please login to book');
      navigate('/login');
      return;
    }
    
    setBookingType(type);
    setSelectedDate('');
    setSelectedTimeSlot('');
    setSelectedSeat('');
    setSelectedBook(null);
    setShowBookingModal(true);
  };

  const handleBookingSubmit = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    if (bookingType === 'seat' && (!selectedTimeSlot || !selectedSeat)) {
      toast.error('Please select time slot and seat');
      return;
    }

    if (bookingType === 'book' && !selectedBook) {
      toast.error('Please select a book');
      return;
    }

    setBookingLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const bookingData = {
        libraryId: library._id,
        type: bookingType,
        date: selectedDate,
        ...(bookingType === 'seat' && {
          seatNumber: selectedSeat,
          timeSlot: selectedTimeSlot,
          amount: getSeatPrice()
        }),
        ...(bookingType === 'book' && {
          bookId: selectedBook._id,
          amount: 0
        }),
        status: 'confirmed',
        paymentId: 'pay_' + Date.now()
      };
      
      await axios.post('/api/user/bookings', bookingData, { headers });
      
      toast.success(`🎉 ${bookingType === 'seat' ? 'Seat' : 'Book'} booked successfully!`);
      setShowBookingModal(false);
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const getSeatPrice = () => {
    if (!library?.seatLayout) return 100;
    
    const seatType = selectedSeat.charAt(0);
    if (seatType === 'A') return library.seatLayout.regular?.price || 100;
    if (seatType === 'B') return library.seatLayout.ac?.price || 150;
    if (seatType === 'C') return library.seatLayout.premium?.price || 200;
    return 100;
  };

  const generateSeats = () => {
    const seats = [];
    const layout = library?.seatLayout || { regular: { count: 20 }, ac: { count: 15 }, premium: { count: 10 } };
    
    for (let i = 1; i <= (layout.regular?.count || 20); i++) {
      seats.push(`A-${i.toString().padStart(2, '0')}`);
    }
    
    for (let i = 1; i <= (layout.ac?.count || 15); i++) {
      seats.push(`B-${i.toString().padStart(2, '0')}`);
    }
    
    for (let i = 1; i <= (layout.premium?.count || 10); i++) {
      seats.push(`C-${i.toString().padStart(2, '0')}`);
    }
    
    return seats;
  };

  const getTimeSlots = () => {
    return [
      '09:00-12:00',
      '12:00-15:00', 
      '15:00-18:00',
      '18:00-21:00',
      '09:00-17:00',
      '10:00-18:00'
    ];
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Library...</p>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Library not found</p>
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
              <button
                onClick={() => navigate('/libraries')}
                className={`mb-4 text-blue-500 hover:text-blue-600 transition-colors`}
              >
                ← Back to Libraries
              </button>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {library.name}
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                📍 {library.area}, {library.city}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => handleBookNow('seat')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                🪑 Book Seat
              </button>
              <button
                onClick={() => handleBookNow('book')}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                📚 Reserve Book
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="container mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'seats', label: '🪑 Seats' },
              { id: 'books', label: '📚 Books' },
              { id: 'facilities', label: '🏢 Facilities' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? `border-b-2 border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-2 backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>About This Library</h3>
              <div className="space-y-4">
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Address</h4>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{library.address}</p>
                </div>
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Contact</h4>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📞 {library.phone}</p>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>📧 {library.email}</p>
                </div>
                <div>
                  <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Opening Hours</h4>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    🕒 {library.openingHours?.open} - {library.openingHours?.close}
                  </p>
                </div>
              </div>
            </div>

            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Seats</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {(library.seatLayout?.regular?.count || 20) + (library.seatLayout?.ac?.count || 15) + (library.seatLayout?.premium?.count || 10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Available Books</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{books.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Rating</span>
                  <span className="font-bold text-yellow-500">⭐ 4.{Math.floor(Math.random() * 5) + 3}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seats' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Seat Layout & Pricing</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className={`p-4 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                <h4 className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Regular Seats (A)</h4>
                <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                  {library.seatLayout?.regular?.count || 20} seats available
                </p>
                <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  ₹{library.seatLayout?.regular?.price || 100}/day
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
                <h4 className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>AC Seats (B)</h4>
                <p className={`text-sm ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                  {library.seatLayout?.ac?.count || 15} seats available
                </p>
                <p className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                  ₹{library.seatLayout?.ac?.price || 150}/day
                </p>
              </div>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                <h4 className={`font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Premium Seats (C)</h4>
                <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-600'}`}>
                  {library.seatLayout?.premium?.count || 10} seats available
                </p>
                <p className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  ₹{library.seatLayout?.premium?.price || 200}/day
                </p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => handleBookNow('seat')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                🪑 Book Seat Now
              </button>
            </div>
          </div>
        )}

        {activeTab === 'books' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Available Books</h3>
              <button
                onClick={() => handleBookNow('book')}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-6 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                📚 Reserve Book
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <div key={book._id} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{book.title}</h4>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>by {book.author}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{book.genre}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className={`text-xs ${book.availableCopies > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Not available'}
                    </span>
                    <span className="text-xs text-gray-500">Free</span>
                  </div>
                </div>
              ))}
            </div>
            {books.length === 0 && (
              <div className="text-center py-8">
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No books available at this library</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Facilities & Amenities</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(library.facilities || ['WiFi', 'AC', 'Parking']).map((facility, index) => (
                <div key={index} className={`p-4 rounded-lg border ${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {facility === 'WiFi' ? '📶' :
                       facility === 'AC' ? '❄️' :
                       facility === 'Parking' ? '🚗' :
                       facility === 'Cafeteria' ? '☕' :
                       facility === 'Lockers' ? '🔒' :
                       facility === 'Printer' ? '🖨️' : '✅'}
                    </span>
                    <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{facility}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {bookingType === 'seat' ? '🪑 Book Seat' : '📚 Reserve Book'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</label>
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

              {bookingType === 'seat' && (
                <>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Time Slot</label>
                    <select
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select time slot</option>
                      {getTimeSlots().map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Seat</label>
                    <select
                      value={selectedSeat}
                      onChange={(e) => setSelectedSeat(e.target.value)}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select seat</option>
                      {generateSeats().map((seat) => (
                        <option key={seat} value={seat}>
                          {seat} - ₹{seat.charAt(0) === 'A' ? (library.seatLayout?.regular?.price || 100) :
                                    seat.charAt(0) === 'B' ? (library.seatLayout?.ac?.price || 150) :
                                    (library.seatLayout?.premium?.price || 200)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {bookingType === 'book' && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Book</label>
                  <select
                    value={selectedBook?._id || ''}
                    onChange={(e) => {
                      const book = books.find(b => b._id === e.target.value);
                      setSelectedBook(book);
                    }}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select book</option>
                    {books.filter(book => book.availableCopies > 0).map((book) => (
                      <option key={book._id} value={book._id}>
                        {book.title} by {book.author}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedSeat && bookingType === 'seat' && (
                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    Total Amount: ₹{getSeatPrice()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                onClick={handleBookingSubmit}
                disabled={bookingLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {bookingLoading ? 'Booking...' : `Book ${bookingType === 'seat' ? 'Seat' : 'Book'}`}
              </button>
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryDetails;