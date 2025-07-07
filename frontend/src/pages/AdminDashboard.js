import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import ImageUpload from '../components/ImageUpload';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    totalBookings: 45,
    todayBookings: 8,
    totalRevenue: 12500,
    totalBooks: 150
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [books, setBooks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [libraryUsers, setLibraryUsers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    genre: '',
    isbn: '',
    totalCopies: 1,
    description: '',
    coverImage: null
  });
  const [newOffer, setNewOffer] = useState({
    title: '',
    discount: 0,
    code: '',
    validUntil: '',
    description: ''
  });
  const [editingBook, setEditingBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Fetch real data from APIs
      const [booksRes, usersRes, offersRes] = await Promise.all([
        axios.get('/api/admin/books', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/admin/library-users', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/admin/admin-offers', { headers }).catch(() => ({ data: [] }))
      ]);
      
      console.log('Books data:', booksRes.data);
      console.log('Users data:', usersRes.data);
      console.log('Offers data:', offersRes.data);
      
      setBooks(booksRes.data || []);
      setLibraryUsers(usersRes.data || []);
      setOffers(offersRes.data || []);
      
      // Generate realistic stats
      const totalBooks = booksRes.data?.length || 0;
      const totalUsers = usersRes.data?.length || 0;
      const mockBookings = [
        { _id: '1', userName: 'Alice Johnson', type: 'seat', seatNumber: 'A-15', date: new Date().toISOString().split('T')[0], status: 'confirmed', amount: 150 },
        { _id: '2', userName: 'Bob Smith', type: 'book', bookTitle: 'JavaScript Guide', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], status: 'pending', amount: 0 },
        { _id: '3', userName: 'Carol Davis', type: 'seat', seatNumber: 'B-08', date: new Date().toISOString().split('T')[0], status: 'confirmed', amount: 200 },
        { _id: '4', userName: 'David Wilson', type: 'seat', seatNumber: 'C-12', date: new Date().toISOString().split('T')[0], status: 'confirmed', amount: 175 },
        { _id: '5', userName: 'Emma Brown', type: 'book', bookTitle: 'React Handbook', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], status: 'confirmed', amount: 0 }
      ];
      
      setBookings(mockBookings);
      
      const confirmedBookings = mockBookings.filter(b => b.status === 'confirmed');
      const todayBookings = mockBookings.filter(b => b.date === new Date().toISOString().split('T')[0]);
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.amount, 0);
      
      setStats({
        totalBookings: mockBookings.length,
        todayBookings: todayBookings.length,
        totalRevenue,
        totalBooks,
        totalUsers,
        confirmedBookings: confirmedBookings.length,
        pendingBookings: mockBookings.filter(b => b.status === 'pending').length
      });
      

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const bookData = {
        ...newBook,
        availableCopies: newBook.totalCopies,
        language: 'English',
        isActive: true
      };
      
      console.log('Adding book:', bookData);
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      if (editingBook) {
        const response = await axios.put(`/api/admin/books/${editingBook._id}`, bookData, { headers });
        setBooks(books.map(book => book._id === editingBook._id ? response.data : book));
        toast.success('📚 Book updated successfully!');
      } else {
        const response = await axios.post('/api/admin/books', bookData, { headers });
        console.log('Book added response:', response.data);
        setBooks([...books, response.data]);
        toast.success('📚 Book added successfully!');
      }
      
      setNewBook({ title: '', author: '', genre: '', isbn: '', totalCopies: 1, description: '', coverImage: null });
      setEditingBook(null);
      setShowAddBook(false);
      fetchAdminData();
    } catch (error) {
      console.error('Add book error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || (editingBook ? 'Failed to update book' : 'Failed to add book'));
    }
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setNewBook({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      totalCopies: book.totalCopies,
      description: book.description,
      coverImage: book.coverImage
    });
    setShowAddBook(true);
  };

  const handleDeleteBook = async (id) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        console.log('Deleting book:', id);
        await axios.delete(`/api/admin/books/${id}`, { headers });
        setBooks(books.filter(book => book._id !== id));
        toast.success('🗑️ Book deleted successfully!');
        fetchAdminData();
      } catch (error) {
        console.error('Delete book error:', error.response?.data || error.message);
        toast.error('Failed to delete book');
      }
    }
  };

  const handleUpdateBookingStatus = (id, status) => {
    setBookings(bookings.map(booking => 
      booking._id === id ? { ...booking, status } : booking
    ));
    toast.success(`📋 Booking ${status} successfully!`);
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const offerData = {
        ...newOffer,
        isActive: true
      };
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('Adding offer:', offerData);
      const response = await axios.post('/api/admin/admin-offers', offerData, { headers });
      console.log('Offer added response:', response.data);
      
      setOffers([...offers, response.data]);
      setNewOffer({ title: '', discount: 0, code: '', validUntil: '', description: '' });
      setShowAddOffer(false);
      toast.success('🎁 Offer added successfully!');
      fetchAdminData();
    } catch (error) {
      console.error('Add offer error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to add offer');
    }
  };

  const handleToggleOffer = async (id) => {
    try {
      const offer = offers.find(o => o._id === id);
      const updatedOffer = {
        ...offer,
        isActive: !offer.isActive
      };
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      console.log('Toggling offer:', updatedOffer);
      const response = await axios.put(`/api/admin/admin-offers/${id}`, updatedOffer, { headers });
      console.log('Toggle offer response:', response.data);
      
      setOffers(offers.map(o => o._id === id ? response.data : o));
      toast.success('🎁 Offer status updated!');
      fetchAdminData();
    } catch (error) {
      console.error('Toggle offer error:', error.response?.data || error.message);
      toast.error('Failed to update offer');
    }
  };

  const handleDeleteOffer = async (id) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        console.log('Deleting offer:', id);
        await axios.delete(`/api/admin/admin-offers/${id}`, { headers });
        setOffers(offers.filter(offer => offer._id !== id));
        toast.success('🗑️ Offer deleted successfully!');
        fetchAdminData();
      } catch (error) {
        console.error('Delete offer error:', error.response?.data || error.message);
        toast.error('Failed to delete offer');
      }
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Library Admin Dashboard
            </h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Welcome back, {user?.name}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
            <span className="text-sm font-semibold">🔑 ADMIN</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'books', label: '📚 Books' },
              { id: 'bookings', label: '📅 Bookings' },
              { id: 'users', label: '👥 Users' },
              { id: 'offers', label: '🎁 Offers' },
              { id: 'reports', label: '📈 Reports' }
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
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[
                { title: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'from-blue-500 to-cyan-500' },
                { title: "Today's Bookings", value: stats.todayBookings, icon: '📊', color: 'from-green-500 to-teal-500' },
                { title: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: '💰', color: 'from-purple-500 to-pink-500' },
                { title: 'Total Books', value: stats.totalBooks, icon: '📚', color: 'from-yellow-500 to-orange-500' }
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

            {/* Quick Actions */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  📚 Manage Books
                </h3>
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Add, edit, or remove books from your library
                </p>
                <button 
                  onClick={() => setActiveTab('books')}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  Manage Books
                </button>
              </div>

              <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  📅 View Bookings
                </h3>
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage seat and book reservations
                </p>
                <button 
                  onClick={() => setActiveTab('bookings')}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  View Bookings
                </button>
              </div>

              <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  📈 Reports
                </h3>
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Download booking and revenue reports
                </p>
                <button 
                  onClick={() => setActiveTab('reports')}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                >
                  View Reports
                </button>
              </div>
            </div>
          </>
        )}

        {/* Books Management Tab */}
        {activeTab === 'books' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                📚 Books Management
              </h2>
              <button 
                onClick={() => setShowAddBook(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                + Add Book
              </button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Title</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Author</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Genre</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Available</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        <div className="flex items-center space-x-3">
                          {book.coverImage ? (
                            <img src={book.coverImage} alt={book.title} className="w-10 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-12 bg-gray-300 rounded flex items-center justify-center text-xs">📚</div>
                          )}
                          <span>{book.title}</span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {book.author}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {book.genre}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {book.availableCopies}/{book.totalCopies}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditBook(book)}
                            className="text-blue-500 hover:text-blue-600 text-sm transition-colors"
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteBook(book._id)}
                            className="text-red-500 hover:text-red-600 text-sm transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Management Tab */}
        {activeTab === 'bookings' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📅 Bookings Management
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User</th>
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
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {booking.userName}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {booking.type === 'seat' ? '🪑 Seat' : '📚 Book'}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {booking.type === 'seat' ? booking.seatNumber : booking.bookTitle}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {booking.date}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        ₹{booking.amount}
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
                        <div className="flex space-x-2">
                          {booking.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateBookingStatus(booking._id, 'confirmed')}
                                className="text-green-500 hover:text-green-600 text-sm"
                              >
                                ✅ Confirm
                              </button>
                              <button 
                                onClick={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                                className="text-red-500 hover:text-red-600 text-sm"
                              >
                                ❌ Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              👥 Library Users
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total Bookings</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Last Visit</th>
                  </tr>
                </thead>
                <tbody>
                  {libraryUsers.map((user) => (
                    <tr key={user._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {user.name}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {user.email}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {user.totalBookings || 0}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Offers Tab */}
        {activeTab === 'offers' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🎁 Offers & Promotions
              </h2>
              <button 
                onClick={() => setShowAddOffer(true)}
                className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
              >
                + Create Offer
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                    isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {offer.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      offer.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {offer.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      💰 Discount: {offer.discount}%
                    </p>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      🏷️ Code: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{offer.code}</span>
                    </p>
                    <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                      📅 Valid Until: {new Date(offer.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button 
                      onClick={() => handleToggleOffer(offer._id)}
                      className={`text-sm px-3 py-1 rounded ${
                        offer.isActive ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                      }`}
                    >
                      {offer.isActive ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this offer?')) {
                          handleDeleteOffer(offer._id);
                        }
                      }}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Analytics Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Booking Status Pie Chart */}
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📊 Booking Status Distribution</h3>
                <div className="h-64">
                  <Pie 
                    data={{
                      labels: ['Confirmed', 'Pending', 'Cancelled'],
                      datasets: [{
                        data: [
                          stats.confirmedBookings || 0,
                          stats.pendingBookings || 0,
                          1 // Mock cancelled
                        ],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
                        borderWidth: 2,
                        borderColor: isDark ? '#374151' : '#ffffff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: isDark ? '#D1D5DB' : '#374151',
                            padding: 20
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Revenue by Type Pie Chart */}
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>💰 Revenue by Booking Type</h3>
                <div className="h-64">
                  <Pie 
                    data={{
                      labels: ['Seat Bookings', 'Book Reservations', 'Premium Services'],
                      datasets: [{
                        data: [
                          bookings.filter(b => b.type === 'seat' && b.status === 'confirmed').reduce((sum, b) => sum + b.amount, 0),
                          500, // Mock book revenue
                          750  // Mock premium revenue
                        ],
                        backgroundColor: ['#3B82F6', '#8B5CF6', '#F59E0B'],
                        borderWidth: 2,
                        borderColor: isDark ? '#374151' : '#ffffff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: isDark ? '#D1D5DB' : '#374151',
                            padding: 20
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.label + ': ₹' + context.parsed;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Weekly Revenue Bar Chart */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📈 Weekly Revenue Trend</h3>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                      label: 'Revenue (₹)',
                      data: [1200, 1900, 800, 1500, 2000, 2500, 1800],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: isDark ? '#D1D5DB' : '#374151'
                        }
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: isDark ? '#D1D5DB' : '#374151'
                        },
                        grid: {
                          color: isDark ? '#374151' : '#E5E7EB'
                        }
                      },
                      y: {
                        ticks: {
                          color: isDark ? '#D1D5DB' : '#374151'
                        },
                        grid: {
                          color: isDark ? '#374151' : '#E5E7EB'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Download Reports */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📈 Download Reports</h3>
                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      const reportData = `Revenue Report\n\nTotal Revenue: ₹${stats.totalRevenue}\nToday's Revenue: ₹${stats.todayBookings * 150}\nTotal Bookings: ${stats.totalBookings}\nConfirmed Bookings: ${stats.confirmedBookings}\nPending Bookings: ${stats.pendingBookings}\nAverage per Booking: ₹${Math.round(stats.totalRevenue / stats.totalBookings)}\n\nGenerated: ${new Date().toLocaleString()}`;
                      const blob = new Blob([reportData], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'revenue-report.txt';
                      a.click();
                      toast.success('📊 Revenue report downloaded!');
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    📊 Download Revenue Report
                  </button>
                  <button 
                    onClick={() => {
                      const bookingData = bookings.map(b => `${b.userName},${b.type},${b.status},${b.amount},${b.date}`).join('\n');
                      const csvData = `User,Type,Status,Amount,Date\n${bookingData}`;
                      const blob = new Blob([csvData], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'bookings-report.csv';
                      a.click();
                      toast.success('📅 Bookings report downloaded!');
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    📅 Export Bookings Data
                  </button>
                  <button 
                    onClick={() => {
                      const userData = libraryUsers.map(u => `${u.name},${u.email},${u.totalBookings},${u.lastVisit}`).join('\n');
                      const csvData = `Name,Email,Total Bookings,Last Visit\n${userData}`;
                      const blob = new Blob([csvData], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'users-report.csv';
                      a.click();
                      toast.success('👥 Users report downloaded!');
                    }}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    👥 Export Users Data
                  </button>
                </div>
              </div>
              
              <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
                <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📚 Library Analytics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Books</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.totalBooks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Available Books</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{books.reduce((sum, book) => sum + (book.availableCopies || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Active Users</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Occupancy Rate</span>
                    <span className="font-bold text-green-500">{Math.round((stats.confirmedBookings / stats.totalBookings) * 100) || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Avg. Revenue/Day</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>₹{Math.round(stats.totalRevenue / 7)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Book Modal */}
        {showAddBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in overflow-y-auto">
            <div className={`rounded-2xl p-6 w-full max-w-md mx-4 my-8 transform transition-all duration-500 animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h3>
              <form onSubmit={handleAddBook} className="space-y-4">
                <input
                  type="text"
                  placeholder="Book Title"
                  value={newBook.title}
                  onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <input
                  type="text"
                  placeholder="Author Name"
                  value={newBook.author}
                  onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Genre"
                    value={newBook.genre}
                    onChange={(e) => setNewBook({...newBook, genre: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Total Copies"
                    value={newBook.totalCopies}
                    onChange={(e) => setNewBook({...newBook, totalCopies: parseInt(e.target.value) || 1})}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="ISBN (Optional)"
                  value={newBook.isbn}
                  onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <textarea
                  placeholder="Description (Optional)"
                  value={newBook.description}
                  onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="3"
                />
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Book Cover</label>
                    <ImageUpload 
                      onImageSelect={(imageUrl, file) => setNewBook({...newBook, coverImage: imageUrl})}
                      currentImage={newBook.coverImage}
                      placeholder="Upload book cover image"
                    />
                  </div>
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold transition-all hover:scale-105"
                  >
                    {editingBook ? 'Update Book' : 'Add Book'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBook(false);
                      setEditingBook(null);
                      setNewBook({ title: '', author: '', genre: '', isbn: '', totalCopies: 1, description: '', coverImage: null });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Offer Modal */}
        {showAddOffer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
            <div className={`rounded-2xl p-6 w-full max-w-md mx-4 transform transition-all duration-500 animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Create New Offer
              </h3>
              <form onSubmit={handleAddOffer} className="space-y-4">
                <input
                  type="text"
                  placeholder="Offer Title"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({...newOffer, title: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Discount %"
                    value={newOffer.discount}
                    onChange={(e) => setNewOffer({...newOffer, discount: parseInt(e.target.value) || 0})}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Promo Code"
                    value={newOffer.code}
                    onChange={(e) => setNewOffer({...newOffer, code: e.target.value.toUpperCase()})}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                </div>
                <input
                  type="date"
                  placeholder="Valid Until"
                  value={newOffer.validUntil}
                  onChange={(e) => setNewOffer({...newOffer, validUntil: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <textarea
                  placeholder="Description (Optional)"
                  value={newOffer.description}
                  onChange={(e) => setNewOffer({...newOffer, description: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows="2"
                />
                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white py-2 rounded-lg font-semibold"
                  >
                    Create Offer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddOffer(false)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9) translateY(-20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;