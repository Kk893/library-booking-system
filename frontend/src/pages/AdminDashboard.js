import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddBookModal from '../components/AddBookModal';
import EditBookModal from '../components/EditBookModal';
import SeatConfigModal from '../components/SeatConfigModal';

const AdminDashboard = () => {
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBooks, setShowBooks] = useState(false);
  const [showSeatConfig, setShowSeatConfig] = useState(false);
  const [showEditBook, setShowEditBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showReports, setShowReports] = useState(false);
  
  const { data: dashboardData, isLoading, refetch } = useQuery(
    'admin-dashboard',
    () => axios.get('/api/admin/library/dashboard').then(res => res.data),
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 10000
    }
  );
  
  const { data: books, refetch: refetchBooks } = useQuery(
    'library-books',
    () => axios.get('/api/admin/books').then(res => res.data),
    { 
      enabled: false, // Start disabled
      refetchInterval: showBooks ? 30000 : false,
      refetchOnWindowFocus: true,
      staleTime: 10000
    }
  );
  
  const handleViewBooks = () => {
    setShowBooks(!showBooks);
    if (!showBooks) {
      refetchBooks(); // Fetch books when showing
    }
  };
  
  const handleEditBook = (book) => {
    setSelectedBook(book);
    setShowEditBook(true);
  };
  
  const handleDeleteBook = async (bookId) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await axios.delete(`/api/admin/books/${bookId}`);
        toast.success('Book deleted successfully!');
        refetchBooks();
        refetch();
      } catch (error) {
        toast.error('Failed to delete book');
        console.error('Failed to delete book:', error);
      }
    }
  };
  
  const handleDownloadMonthlyReport = () => {
    toast.success('Monthly report downloaded successfully!');
    // Create CSV data
    const csvData = `Date,Bookings,Revenue\n${new Date().toLocaleDateString()},${stats?.todayBookings || 0},${stats?.totalRevenue?.[0]?.total || 0}`;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly-report.csv';
    a.click();
  };
  
  const handleExportBookingData = () => {
    toast.success('Booking data exported successfully!');
    const bookingData = recentBookings?.map(booking => 
      `${booking.userId?.name},${booking.type},${booking.amount},${booking.status},${new Date(booking.createdAt).toLocaleDateString()}`
    ).join('\n');
    const csvData = `User,Type,Amount,Status,Date\n${bookingData}`;
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'booking-data.csv';
    a.click();
  };
  
  const handleRevenueAnalytics = () => {
    toast.success('Revenue analytics generated!');
    alert(`Revenue Analytics:\n\nTotal Revenue: ₹${stats?.totalRevenue?.[0]?.total || 0}\nTotal Bookings: ${stats?.totalBookings || 0}\nAverage per Booking: ₹${Math.round((stats?.totalRevenue?.[0]?.total || 0) / (stats?.totalBookings || 1))}\nToday's Revenue: ₹${(stats?.todayBookings || 0) * 100}`);
  };

  if (isLoading) return <div className="text-center">Loading dashboard...</div>;

  const { stats, recentBookings } = dashboardData || {};

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Library Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">{stats?.totalBookings || 0}</div>
          <div className="text-gray-600">Total Bookings</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{stats?.todayBookings || 0}</div>
          <div className="text-gray-600">Today's Bookings</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">₹{stats?.totalRevenue?.[0]?.total || 0}</div>
          <div className="text-gray-600">Total Revenue</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">{stats?.totalBooks || 0}</div>
          <div className="text-gray-600">Total Books</div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">User</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Details</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings?.map(booking => (
                <tr key={booking._id} className="border-b">
                  <td className="py-2">{booking.userId?.name}</td>
                  <td className="py-2 capitalize">{booking.type}</td>
                  <td className="py-2">
                    {booking.type === 'seat' 
                      ? booking.seatNumbers?.join(', ')
                      : booking.bookId?.title
                    }
                  </td>
                  <td className="py-2">₹{booking.amount}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-2">{new Date(booking.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <h3 className="font-semibold mb-2">Manage Books</h3>
          <p className="text-sm text-gray-600 mb-4">Add, edit, or remove books from your library</p>
          <div className="space-y-2">
            <button 
              onClick={() => setShowAddBook(true)}
              className="btn-primary w-full"
            >
              Add Book
            </button>
            <button 
              onClick={handleViewBooks}
              className="btn-secondary w-full"
            >
              {showBooks ? 'Hide Books' : 'View Books'}
            </button>
          </div>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold mb-2">Seat Layout</h3>
          <p className="text-sm text-gray-600 mb-4">Configure seat arrangements and pricing</p>
          <button 
            onClick={() => setShowSeatConfig(true)}
            className="btn-primary"
          >
            Configure Seats
          </button>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold mb-2">Reports</h3>
          <p className="text-sm text-gray-600 mb-4">Download booking and revenue reports</p>
          <button 
            onClick={() => setShowReports(!showReports)}
            className="btn-primary"
          >
            {showReports ? 'Hide Reports' : 'View Reports'}
          </button>
        </div>
      </div>
      
      {/* Books List */}
      {showBooks && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Library Books</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Title</th>
                  <th className="text-left py-2">Author</th>
                  <th className="text-left py-2">Genre</th>
                  <th className="text-left py-2">Available</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books?.map(book => (
                  <tr key={book._id} className="border-b">
                    <td className="py-2 font-medium">{book.title}</td>
                    <td className="py-2">{book.author}</td>
                    <td className="py-2">{book.genre}</td>
                    <td className="py-2">{book.availableCopies}/{book.totalCopies}</td>
                    <td className="py-2">
                      <button 
                        onClick={() => handleEditBook(book)}
                        className="text-blue-600 hover:underline text-xs mr-2"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteBook(book._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Reports Section */}
      {showReports && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Reports</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">Monthly Revenue</h3>
              <p className="text-2xl font-bold text-blue-600">₹{stats?.totalRevenue?.[0]?.total || 0}</p>
              <p className="text-sm text-blue-600">This Month</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">Active Books</h3>
              <p className="text-2xl font-bold text-green-600">{stats?.totalBooks || 0}</p>
              <p className="text-sm text-green-600">Available</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800">Avg. Daily Bookings</h3>
              <p className="text-2xl font-bold text-purple-600">{Math.round((stats?.totalBookings || 0) / 30)}</p>
              <p className="text-sm text-purple-600">Per Day</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-800">Success Rate</h3>
              <p className="text-2xl font-bold text-orange-600">95%</p>
              <p className="text-sm text-orange-600">Completion</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={handleDownloadMonthlyReport}
                  className="btn-secondary w-full text-sm"
                >
                  Download Monthly Report
                </button>
                <button 
                  onClick={handleExportBookingData}
                  className="btn-secondary w-full text-sm"
                >
                  Export Booking Data
                </button>
                <button 
                  onClick={handleRevenueAnalytics}
                  className="btn-secondary w-full text-sm"
                >
                  Revenue Analytics
                </button>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Recent Activity</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Today's Bookings</span>
                  <span className="font-medium">{stats?.todayBookings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Users</span>
                  <span className="font-medium">{recentBookings?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Sessions</span>
                  <span className="font-medium text-green-600">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <AddBookModal 
        isOpen={showAddBook}
        onClose={() => setShowAddBook(false)}
        onSuccess={() => {
          refetch();
          refetchBooks();
        }}
        libraryId={dashboardData?.libraryId}
      />
      
      <SeatConfigModal 
        isOpen={showSeatConfig}
        onClose={() => setShowSeatConfig(false)}
        onSuccess={() => refetch()}
        libraryId={dashboardData?.libraryId}
      />
      
      <EditBookModal 
        isOpen={showEditBook}
        onClose={() => {
          setShowEditBook(false);
          setSelectedBook(null);
        }}
        onSuccess={() => {
          refetch();
          refetchBooks();
        }}
        book={selectedBook}
      />
    </div>
  );
};

export default AdminDashboard;