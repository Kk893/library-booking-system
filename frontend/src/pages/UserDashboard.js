import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [libraries, setLibraries] = useState([]);
  const [favoriteLibraries, setFavoriteLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    totalSpent: 0,
    favoriteLibraries: 0
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'user') {
      navigate('/');
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const baseURL = 'http://localhost:5000';

      const [bookingsRes, librariesRes] = await Promise.all([
        axios.get(`${baseURL}/api/user/bookings`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${baseURL}/api/libraries`, { headers }).catch(() => ({ data: [] }))
      ]);

      setBookings(bookingsRes.data || []);
      setLibraries(librariesRes.data || []);
      
      // Calculate stats
      const totalBookings = bookingsRes.data?.length || 0;
      const activeBookings = bookingsRes.data?.filter(b => b.status === 'confirmed').length || 0;
      const totalSpent = bookingsRes.data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
      
      setStats({
        totalBookings,
        activeBookings,
        totalSpent,
        favoriteLibraries: favoriteLibraries.length
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
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
        fetchUserData();
      } catch (error) {
        toast.error('Failed to cancel booking');
      }
    }
  };

  const toggleFavorite = (libraryId) => {
    const isFavorite = favoriteLibraries.includes(libraryId);
    if (isFavorite) {
      setFavoriteLibraries(favoriteLibraries.filter(id => id !== libraryId));
      toast.success('❤️ Removed from favorites');
    } else {
      setFavoriteLibraries([...favoriteLibraries, libraryId]);
      toast.success('💖 Added to favorites');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`backdrop-blur-lg border-b ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl text-white">👤</span>
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  My Dashboard
                </h1>
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Welcome back, {user?.name}
                </p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
              <span className="text-sm font-semibold">📚 USER</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'from-blue-500 to-cyan-500' },
            { title: 'Active Bookings', value: stats.activeBookings, icon: '✅', color: 'from-green-500 to-teal-500' },
            { title: 'Total Spent', value: `₹${stats.totalSpent}`, icon: '💰', color: 'from-purple-500 to-pink-500' },
            { title: 'Favorite Libraries', value: stats.favoriteLibraries, icon: '❤️', color: 'from-yellow-500 to-orange-500' }
          ].map((stat, index) => (
            <div
              key={index}
              className={`backdrop-blur-lg rounded-2xl p-6 transform transition-all duration-500 hover:scale-105 ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center`}>
                  <span className="text-2xl text-white">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'bookings', label: '📅 My Bookings' },
              { id: 'libraries', label: '🏢 Browse Libraries' },
              { id: 'favorites', label: '❤️ Favorites' },
              { id: 'profile', label: '👤 Profile' }
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

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Bookings */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📅 Recent Bookings</h3>
              <div className="space-y-3">
                {bookings.slice(0, 3).map((booking) => (
                  <div key={booking._id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {booking.type === 'seat' ? `Seat ${booking.seatNumber}` : booking.bookTitle}
                        </p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(booking.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
                {bookings.length === 0 && (
                  <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No bookings yet
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎯 Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/libraries')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  🔍 Find Libraries
                </button>
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  📅 View Bookings
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  👤 Edit Profile
                </button>
              </div>
            </div>

            {/* Activity Summary */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📊 Activity Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>This Month</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {bookings.filter(b => new Date(b.date).getMonth() === new Date().getMonth()).length} bookings
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Favorite Library</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {libraries.length > 0 ? libraries[0].name : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Member Since</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📅 My Bookings
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Details</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {booking.type === 'seat' ? '🪑 Seat' : '📚 Book'}
                      </td>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {booking.type === 'seat' ? `Seat ${booking.seatNumber}` : booking.bookTitle}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(booking.date).toLocaleDateString()}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        ₹{booking.amount || 0}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {booking.status === 'confirmed' && (
                          <button 
                            onClick={() => handleCancelBooking(booking._id)}
                            className="text-red-500 hover:text-red-600 text-sm"
                          >
                            🚫 Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <div className="text-center py-8">
                  <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No bookings found
                  </p>
                  <button 
                    onClick={() => navigate('/libraries')}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
                  >
                    Book Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'libraries' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              🏢 Browse Libraries
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {libraries.map((library) => (
                <div
                  key={library._id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                    isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {library.name}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(library._id)}
                      className={`text-xl ${
                        favoriteLibraries.includes(library._id) ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      {favoriteLibraries.includes(library._id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 {library.area}, {library.city}
                  </p>
                  <p className={`text-xs mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    📞 {library.phone}
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => navigate(`/libraries/${library._id}`)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm"
                    >
                      📅 Book Seat
                    </button>
                    <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm">
                      📚 View Books
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              ❤️ Favorite Libraries
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {libraries.filter(lib => favoriteLibraries.includes(lib._id)).map((library) => (
                <div
                  key={library._id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                    isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {library.name}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(library._id)}
                      className="text-xl text-red-500"
                    >
                      ❤️
                    </button>
                  </div>
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    📍 {library.area}, {library.city}
                  </p>
                  <button 
                    onClick={() => navigate(`/libraries/${library._id}`)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm"
                  >
                    📅 Book Now
                  </button>
                </div>
              ))}
              {favoriteLibraries.length === 0 && (
                <div className="col-span-3 text-center py-8">
                  <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No favorite libraries yet
                  </p>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Click the heart icon on any library to add it to favorites
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              👤 My Profile
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                    <input
                      type="tel"
                      value={user?.phone || ''}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      readOnly
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Account Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Member Since</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Bookings</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.totalBookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Spent</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>₹{stats.totalSpent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Account Status</span>
                    <span className="font-bold text-green-500">✅ Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;