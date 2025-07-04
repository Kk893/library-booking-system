import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FiUsers, FiBookOpen, FiMap, FiCalendar, FiSettings, 
  FiDollarSign, FiTag, FiChevronDown, FiChevronUp, FiEdit, 
  FiTrash2, FiPlus, FiSearch, FiFilter
} from 'react-icons/fi';

// Mock data for demo purposes
const librariesData = [
  { id: 1, name: 'Central City Library', city: 'New York', bookings: 128, revenue: 4520 },
  { id: 2, name: 'Riverside Reading Hub', city: 'New York', bookings: 87, revenue: 2980 },
  { id: 3, name: 'Northside Knowledge Center', city: 'New York', bookings: 65, revenue: 1890 },
  { id: 4, name: 'Eastside Educational Library', city: 'Boston', bookings: 103, revenue: 3450 },
  { id: 5, name: 'Community Learning Center', city: 'Boston', bookings: 92, revenue: 2760 },
];

const recentBookingsData = [
  { 
    id: 'B1285', 
    user: 'John Smith', 
    email: 'john@example.com',
    library: 'Central City Library', 
    seatType: 'AC Cubicle', 
    date: '2025-07-01', 
    time: '10:00 AM - 1:00 PM',
    status: 'Confirmed',
    amount: 12
  },
  { 
    id: 'B1284', 
    user: 'Sarah Johnson', 
    email: 'sarah@example.com',
    library: 'Riverside Reading Hub', 
    seatType: 'Regular Seat', 
    date: '2025-07-01', 
    time: '2:00 PM - 5:00 PM',
    status: 'Confirmed',
    amount: 5
  },
  { 
    id: 'B1283', 
    user: 'Michael Wong', 
    email: 'michael@example.com',
    library: 'Eastside Educational Library', 
    seatType: 'Premium Booth', 
    date: '2025-07-02', 
    time: '9:00 AM - 12:00 PM',
    status: 'Pending',
    amount: 20
  },
  { 
    id: 'B1282', 
    user: 'Emma Davis', 
    email: 'emma@example.com',
    library: 'Central City Library', 
    seatType: 'Regular Seat', 
    date: '2025-07-02', 
    time: '3:00 PM - 6:00 PM',
    status: 'Cancelled',
    amount: 5
  },
];

const AdminDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLibraryFilter, setShowLibraryFilter] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Simple authentication check - in production this would check against actual auth state
  useEffect(() => {
    const isAdmin = localStorage.getItem('userRole') === 'admin' || localStorage.getItem('userRole') === 'super_admin';
    
    // For demo purposes, we'll just set a flag to bypass authentication
    const bypassAuth = true;
    
    if (!isAdmin && !bypassAuth) {
      router.push('/login?redirect=admin');
    }
  }, [router]);

  // Filter bookings based on search term
  const filteredBookings = recentBookingsData.filter(booking => {
    const matchesSearch = searchTerm === '' || 
      booking.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.library.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLibrary = selectedLibrary === '' || booking.library === selectedLibrary;
    
    return matchesSearch && matchesLibrary;
  });

  // Calculate stats
  const totalRevenue = librariesData.reduce((sum, lib) => sum + lib.revenue, 0);
  const totalBookings = librariesData.reduce((sum, lib) => sum + lib.bookings, 0);
  const confirmedBookings = recentBookingsData.filter(b => b.status === 'Confirmed').length;
  const pendingBookings = recentBookingsData.filter(b => b.status === 'Pending').length;

  return (
    <>
      <Head>
        <title>Admin Dashboard | LibraryBooking</title>
        <meta name="description" content="Admin dashboard for library booking system" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-primary-800 text-white min-h-screen p-4 hidden md:block">
            <div className="mb-8">
              <h1 className="text-xl font-bold mb-1">LibraryBooking</h1>
              <p className="text-primary-200 text-sm">Admin Dashboard</p>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'dashboard' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiSettings className="mr-3" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('libraries')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'libraries' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiMap className="mr-3" />
                Libraries
              </button>

              <button
                onClick={() => setActiveTab('books')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'books' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiBookOpen className="mr-3" />
                Books
              </button>

              <button
                onClick={() => setActiveTab('bookings')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'bookings' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiCalendar className="mr-3" />
                Bookings
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'users' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiUsers className="mr-3" />
                Users
              </button>

              <button
                onClick={() => setActiveTab('promotions')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'promotions' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiTag className="mr-3" />
                Promotions
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left ${
                  activeTab === 'reports' 
                    ? 'bg-primary-700 text-white' 
                    : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                }`}
              >
                <FiDollarSign className="mr-3" />
                Reports
              </button>
            </nav>

            <div className="absolute bottom-4 left-4 right-4">
              <hr className="border-primary-700 my-4" />
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center mr-2">
                  <span className="font-medium">A</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-primary-300">admin@example.com</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/')} 
                className="w-full py-2 text-sm text-primary-200 hover:text-white"
              >
                Back to Site
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <header className="bg-white shadow-sm py-4 px-6">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-800">
                  {activeTab === 'dashboard' && 'Dashboard'}
                  {activeTab === 'libraries' && 'Manage Libraries'}
                  {activeTab === 'books' && 'Manage Books'}
                  {activeTab === 'bookings' && 'Bookings'}
                  {activeTab === 'users' && 'User Management'}
                  {activeTab === 'promotions' && 'Promotions & Offers'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                </h1>
                
                <button 
                  className="md:hidden text-gray-600 hover:text-gray-900"
                  onClick={() => alert('Mobile menu would open here')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Dashboard Content */}
            <div className="p-6">
              {activeTab === 'dashboard' && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Total Bookings</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">+12.5%</span>
                      </div>
                      <p className="text-2xl font-bold">{totalBookings}</p>
                      <p className="text-gray-500 text-sm mt-2">Last 30 days</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Revenue</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">+8.2%</span>
                      </div>
                      <p className="text-2xl font-bold">${totalRevenue}</p>
                      <p className="text-gray-500 text-sm mt-2">Last 30 days</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Active Libraries</h3>
                      </div>
                      <p className="text-2xl font-bold">{librariesData.length}</p>
                      <p className="text-gray-500 text-sm mt-2">Across {new Set(librariesData.map(l => l.city)).size} cities</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 text-sm font-medium">Bookings Status</h3>
                      </div>
                      <div className="flex gap-3">
                        <div>
                          <p className="text-xl font-bold text-green-600">{confirmedBookings}</p>
                          <p className="text-xs text-gray-500">Confirmed</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-yellow-600">{pendingBookings}</p>
                          <p className="text-xs text-gray-500">Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Bookings */}
                  <div className="bg-white rounded-lg shadow-card mb-8">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
                        <button 
                          onClick={() => setActiveTab('bookings')}
                          className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Library
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date/Time
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recentBookingsData.slice(0, 5).map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                                {booking.id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{booking.user}</div>
                                <div className="text-sm text-gray-500">{booking.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{booking.library}</div>
                                <div className="text-sm text-gray-500">{booking.seatType}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{booking.date}</div>
                                <div className="text-sm text-gray-500">{booking.time}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 
                                    booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'}`}>
                                  {booking.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${booking.amount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Libraries Performance */}
                  <div className="bg-white rounded-lg shadow-card">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Libraries Performance</h2>
                        <button 
                          onClick={() => setActiveTab('libraries')}
                          className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                        >
                          Manage Libraries
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              City
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Bookings
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {librariesData.map((library) => (
                            <tr key={library.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{library.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{library.city}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {library.bookings}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${library.revenue}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button className="text-primary-600 hover:text-primary-900 mr-3">View</button>
                                <button className="text-gray-600 hover:text-gray-900">Edit</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'bookings' && (
                <div className="bg-white rounded-lg shadow-card">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <h2 className="text-lg font-semibold text-gray-800">All Bookings</h2>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            className="form-input pl-9 py-2 w-full"
                            placeholder="Search bookings..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <FiSearch className="absolute left-3 top-3 text-gray-400" />
                        </div>
                        
                        <button 
                          onClick={() => setShowLibraryFilter(!showLibraryFilter)}
                          className="btn btn-outline-secondary flex items-center"
                        >
                          <FiFilter className="mr-2" />
                          Filter
                          {showLibraryFilter ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
                        </button>
                      </div>
                    </div>
                    
                    {showLibraryFilter && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Library</label>
                            <select 
                              className="form-select w-full"
                              value={selectedLibrary}
                              onChange={(e) => setSelectedLibrary(e.target.value)}
                            >
                              <option value="">All Libraries</option>
                              {[...new Set(recentBookingsData.map(b => b.library))].map(lib => (
                                <option key={lib} value={lib}>{lib}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input 
                              type="date" 
                              className="form-input w-full"
                              value={dateRange.start}
                              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input 
                              type="date" 
                              className="form-input w-full"
                              value={dateRange.end}
                              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <button 
                            className="btn btn-outline-secondary mr-2"
                            onClick={() => {
                              setSelectedLibrary('');
                              setDateRange({ start: '', end: '' });
                            }}
                          >
                            Clear
                          </button>
                          <button className="btn btn-primary">Apply Filters</button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Library
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date/Time
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                              {booking.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{booking.user}</div>
                              <div className="text-sm text-gray-500">{booking.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.library}</div>
                              <div className="text-sm text-gray-500">{booking.seatType}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{booking.date}</div>
                              <div className="text-sm text-gray-500">{booking.time}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 
                                  booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'}`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${booking.amount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button className="text-primary-600 hover:text-primary-900 mr-2">
                                <FiEdit size={16} />
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                <FiTrash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {filteredBookings.length === 0 && (
                      <div className="py-8 text-center text-gray-500">
                        No bookings found matching your search criteria
                      </div>
                    )}
                  </div>
                  
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredBookings.length}</span> of{' '}
                        <span className="font-medium">{filteredBookings.length}</span> results
                      </p>
                      
                      <div className="flex space-x-2">
                        <button className="btn btn-outline-secondary px-3 py-1 text-sm">Previous</button>
                        <button className="btn btn-outline-secondary px-3 py-1 text-sm">Next</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Placeholder content for other tabs */}
              {activeTab === 'libraries' && (
                <div className="bg-white rounded-lg shadow-card p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">Manage Libraries</h2>
                    <button className="btn btn-primary flex items-center">
                      <FiPlus className="mr-2" />
                      Add New Library
                    </button>
                  </div>
                  <p className="text-gray-600">This section allows management of all libraries in the system.</p>
                  
                  <div className="mt-4 border p-4 rounded-lg bg-gray-50">
                    <p className="font-medium">Libraries Management Features:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                      <li>Add/Edit/Delete Libraries</li>
                      <li>Manage seat layouts and pricing</li>
                      <li>Configure opening hours</li>
                      <li>Set up facilities and amenities</li>
                      <li>Assign library administrators</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {activeTab === 'books' && (
                <div className="bg-white rounded-lg shadow-card p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Book Management</h2>
                  <p className="text-gray-600">This section allows management of all books in the system.</p>
                </div>
              )}
              
              {activeTab === 'users' && (
                <div className="bg-white rounded-lg shadow-card p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">User Management</h2>
                  <p className="text-gray-600">This section allows management of all users in the system.</p>
                </div>
              )}
              
              {activeTab === 'promotions' && (
                <div className="bg-white rounded-lg shadow-card p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Promotions & Offers</h2>
                  <p className="text-gray-600">This section allows management of promotions, discounts, and special offers.</p>
                </div>
              )}
              
              {activeTab === 'reports' && (
                <div className="bg-white rounded-lg shadow-card p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-6">Reports & Analytics</h2>
                  <p className="text-gray-600">This section provides reports and analytics on system usage.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;