import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

const MyBookings = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showQR, setShowQR] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user, navigate]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get('/api/user/bookings', { headers });
      setBookings(response.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        await axios.put(`/api/user/bookings/${bookingId}/cancel`, {}, { headers });
        toast.success('🚫 Booking cancelled successfully!');
        fetchBookings();
      } catch (error) {
        toast.error('Failed to cancel booking');
      }
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'active') return booking.status === 'confirmed';
    if (filter === 'cancelled') return booking.status === 'cancelled';
    if (filter === 'pending') return booking.status === 'pending';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Bookings...</p>
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
                📅 My Bookings
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage your library bookings
              </p>
            </div>
            <button
              onClick={() => navigate('/libraries')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
            >
              + New Booking
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8">
            {[
              { id: 'all', label: '📋 All Bookings', count: bookings.length },
              { id: 'active', label: '✅ Active', count: bookings.filter(b => b.status === 'confirmed').length },
              { id: 'pending', label: '⏳ Pending', count: bookings.filter(b => b.status === 'pending').length },
              { id: 'cancelled', label: '❌ Cancelled', count: bookings.filter(b => b.status === 'cancelled').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors ${
                  filter === tab.id
                    ? `border-b-2 border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking._id}
              className={`backdrop-blur-lg rounded-2xl p-6 transition-all hover:shadow-lg ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <span className="text-2xl">
                      {booking.type === 'seat' ? '🪑' : '📚'}
                    </span>
                    <div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {booking.type === 'seat' 
                          ? `Seat ${booking.seatNumber}` 
                          : booking.bookId?.title || 'Book Reservation'
                        }
                      </h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        📍 {booking.libraryId?.name} - {booking.libraryId?.area}, {booking.libraryId?.city}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date:</span>
                      <p className={isDark ? 'text-white' : 'text-gray-800'}>
                        {new Date(booking.date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {booking.timeSlot && (
                      <div>
                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Time:</span>
                        <p className={isDark ? 'text-white' : 'text-gray-800'}>{booking.timeSlot}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount:</span>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        ₹{booking.amount || 0}
                      </p>
                    </div>
                    
                    <div>
                      <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  
                  {booking.bookId && (
                    <div className="mt-2">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Book:</span>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {booking.bookId.title} by {booking.bookId.author}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => setShowQR(booking)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        📱 QR Code
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        🚫 Cancel
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => navigate(`/libraries/${booking.libraryId._id}`)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    📍 View Library
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No bookings found
            </p>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {filter === 'all' 
                ? "You haven't made any bookings yet" 
                : `No ${filter} bookings found`
              }
            </p>
            <button
              onClick={() => navigate('/libraries')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
            >
              Browse Libraries
            </button>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-center">
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🎟️ Entry QR Code
              </h3>
              
              <div className="bg-white p-4 rounded-lg mb-4">
                <QRCode
                  value={JSON.stringify({
                    bookingId: showQR._id,
                    userId: user.id,
                    libraryId: showQR.libraryId._id,
                    type: showQR.type,
                    date: showQR.date,
                    seatNumber: showQR.seatNumber,
                    status: showQR.status
                  })}
                  size={200}
                  level="M"
                />
              </div>
              
              <div className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <p><strong>Booking ID:</strong> {showQR._id.slice(-8)}</p>
                <p><strong>Library:</strong> {showQR.libraryId.name}</p>
                <p><strong>Date:</strong> {new Date(showQR.date).toLocaleDateString()}</p>
                {showQR.seatNumber && <p><strong>Seat:</strong> {showQR.seatNumber}</p>}
              </div>
              
              <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <p className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  📱 Show this QR code at the library entrance for quick entry
                </p>
              </div>
              
              <button
                onClick={() => setShowQR(null)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;