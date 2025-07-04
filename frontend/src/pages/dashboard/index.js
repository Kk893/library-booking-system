import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiCalendar, FiBook, FiUsers, FiClock, FiMapPin, FiMoreVertical, FiDownload, FiPrinter, FiArrowRight, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

// Sample data for seat bookings (would come from API in production)
const seatBookingsData = [
  {
    id: 'BK123456',
    libraryId: 1,
    libraryName: 'Central City Library',
    libraryAddress: '123 Main St, Downtown',
    libraryImage: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
    seatType: 'Regular Seat',
    seats: ['A4', 'A5'],
    date: '2025-07-05',
    timeSlot: '10:00 AM - 1:00 PM',
    price: 10.00,
    status: 'upcoming',
    createdAt: '2025-06-20T14:30:00Z',
  },
  {
    id: 'BK789012',
    libraryId: 2,
    libraryName: 'Riverside Reading Hub',
    libraryAddress: '456 River Rd, Westside',
    libraryImage: 'https://images.unsplash.com/photo-1568667256549-094345857637',
    seatType: 'AC Cubicle',
    seats: ['C3'],
    date: '2025-07-10',
    timeSlot: '1:00 PM - 4:00 PM',
    price: 12.00,
    status: 'upcoming',
    createdAt: '2025-06-22T10:15:00Z',
  },
  {
    id: 'BK345678',
    libraryId: 3,
    libraryName: 'Northside Knowledge Center',
    libraryAddress: '789 North Ave, Northside',
    libraryImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66',
    seatType: 'Premium Booth',
    seats: ['P2'],
    date: '2025-06-15',
    timeSlot: '4:00 PM - 7:00 PM',
    price: 20.00,
    status: 'completed',
    createdAt: '2025-06-10T09:45:00Z',
  },
];

// Sample data for book borrowings (would come from API in production)
const bookBorrowingsData = [
  {
    id: 'BB123456',
    libraryId: 1,
    libraryName: 'Central City Library',
    bookId: 1,
    bookTitle: 'The Library at Mount Char',
    bookAuthor: 'Scott Hawkins',
    bookImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
    borrowDate: '2025-06-18',
    dueDate: '2025-07-02',
    status: 'ongoing',
  },
  {
    id: 'BB789012',
    libraryId: 2,
    libraryName: 'Riverside Reading Hub',
    bookId: 2,
    bookTitle: 'Quiet: The Power of Introverts',
    bookAuthor: 'Susan Cain',
    bookImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
    borrowDate: '2025-06-10',
    dueDate: '2025-06-24',
    status: 'overdue',
  },
  {
    id: 'BB345678',
    libraryId: 1,
    libraryName: 'Central City Library',
    bookId: 3,
    bookTitle: 'The Midnight Library',
    bookAuthor: 'Matt Haig',
    bookImage: 'https://images.unsplash.com/photo-1589998059171-988d887df646',
    borrowDate: '2025-05-20',
    dueDate: '2025-06-03',
    status: 'returned',
    returnDate: '2025-06-01',
  },
];

// Sample data for event registrations (would come from API in production)
const eventRegistrationsData = [
  {
    id: 'ER123456',
    libraryId: 1,
    libraryName: 'Central City Library',
    eventId: 1,
    eventTitle: 'Author Meet & Greet',
    eventDate: '2025-07-15',
    eventTime: '6:00 PM - 8:00 PM',
    eventImage: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2',
    status: 'upcoming',
    registrationDate: '2025-06-20T14:30:00Z',
  },
  {
    id: 'ER789012',
    libraryId: 2,
    libraryName: 'Riverside Reading Hub',
    eventId: 2,
    eventTitle: 'Book Club: Fantasy Fiction',
    eventDate: '2025-07-20',
    eventTime: '5:30 PM - 7:30 PM',
    eventImage: 'https://images.unsplash.com/photo-1529148482759-b35b25c5f217',
    status: 'upcoming',
    registrationDate: '2025-06-22T10:15:00Z',
  },
  {
    id: 'ER345678',
    libraryId: 3,
    libraryName: 'Northside Knowledge Center',
    eventId: 3,
    eventTitle: "Children's Story Hour",
    eventDate: '2025-06-15',
    eventTime: '10:00 AM - 11:00 AM',
    eventImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b',
    status: 'completed',
    registrationDate: '2025-06-10T09:45:00Z',
    attended: true,
  },
];

const Dashboard = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState('seats');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [seatBookings, setSeatBookings] = useState([]);
  const [bookBorrowings, setBookBorrowings] = useState([]);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  
  // Set initial data (would fetch from API in production)
  useEffect(() => {
    setSeatBookings(seatBookingsData);
    setBookBorrowings(bookBorrowingsData);
    setEventRegistrations(eventRegistrationsData);
  }, []);
  
  // Check authentication
  useEffect(() => {
    if (router.isReady && !isAuthenticated) {
      router.push('/login?redirect=/dashboard');
    }
  }, [router.isReady, isAuthenticated, router]);
  
  // Filter data based on search term and status filter
  const getFilteredData = (data) => {
    let filtered = [...data];
    
    // Filter by search term if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        // Different search criteria based on data type
        if (activeTab === 'seats') {
          return (
            item.libraryName.toLowerCase().includes(term) ||
            item.id.toLowerCase().includes(term) ||
            item.seatType.toLowerCase().includes(term)
          );
        } else if (activeTab === 'books') {
          return (
            item.bookTitle.toLowerCase().includes(term) ||
            item.bookAuthor.toLowerCase().includes(term) ||
            item.libraryName.toLowerCase().includes(term)
          );
        } else if (activeTab === 'events') {
          return (
            item.eventTitle.toLowerCase().includes(term) ||
            item.libraryName.toLowerCase().includes(term)
          );
        }
        return true;
      });
    }
    
    // Filter by status if not 'all'
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    return filtered;
  };
  
  // Get filtered data based on active tab
  const filteredData = {
    seats: getFilteredData(seatBookings),
    books: getFilteredData(bookBorrowings),
    events: getFilteredData(eventRegistrations),
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      case 'returned':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handle cancel booking (simplified for demo)
  const handleCancelBooking = (id, type) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      alert(`${type} booking ${id} cancelled (simulated)`);
      
      // Update local state based on booking type
      if (type === 'Seat') {
        setSeatBookings(prev => 
          prev.map(booking => 
            booking.id === id 
              ? { ...booking, status: 'cancelled' } 
              : booking
          )
        );
      } else if (type === 'Event') {
        setEventRegistrations(prev => 
          prev.map(reg => 
            reg.id === id 
              ? { ...reg, status: 'cancelled' } 
              : reg
          )
        );
      }
    }
  };
  
  // Handle renew book (simplified for demo)
  const handleRenewBook = (id) => {
    alert(`Book renewal for ${id} processed (simulated)`);
    
    // Update local state
    setBookBorrowings(prev => 
      prev.map(book => 
        book.id === id 
          ? { 
              ...book, 
              dueDate: new Date(new Date(book.dueDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'ongoing'
            } 
          : book
      )
    );
  };
  
  // Handle return book (simplified for demo)
  const handleReturnBook = (id) => {
    alert(`Book return for ${id} processed (simulated)`);
    
    // Update local state
    setBookBorrowings(prev => 
      prev.map(book => 
        book.id === id 
          ? { 
              ...book, 
              status: 'returned',
              returnDate: new Date().toISOString().split('T')[0]
            } 
          : book
      )
    );
  };

  // If the page is still loading (client-side navigation)
  if (router.isFallback || !isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>My Dashboard | LibraryBooking</title>
        <meta name="description" content="Manage your library bookings, borrowed books, and event registrations" />
      </Head>

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Dashboard Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-gray-600">
              Manage your bookings, borrowed books, and event registrations
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex -mb-px space-x-8">
              <button
                className={`pb-4 font-medium text-sm flex items-center ${
                  activeTab === 'seats'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('seats')}
              >
                <FiCalendar className="mr-2" />
                Seat Reservations
              </button>
              
              <button
                className={`pb-4 font-medium text-sm flex items-center ${
                  activeTab === 'books'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('books')}
              >
                <FiBook className="mr-2" />
                Borrowed Books
              </button>
              
              <button
                className={`pb-4 font-medium text-sm flex items-center ${
                  activeTab === 'events'
                    ? 'border-b-2 border-primary-500 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('events')}
              >
                <FiUsers className="mr-2" />
                Event Registrations
              </button>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-md mb-4 md:mb-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input pl-10 w-full"
                placeholder={`Search ${activeTab === 'seats' ? 'reservations' : activeTab === 'books' ? 'books' : 'events'}`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setSearchTerm('')}
                >
                  <FiX className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            <div className="flex items-center">
              <FiFilter className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-600 mr-2">Status:</span>
              <select
                className="form-input py-1 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                {activeTab === 'books' && (
                  <>
                    <option value="overdue">Overdue</option>
                    <option value="returned">Returned</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          {/* Content based on active tab */}
          {activeTab === 'seats' && (
            <div>
              {filteredData.seats.length > 0 ? (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {filteredData.seats.map((booking) => (
                      <div key={booking.id} className="p-6 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div className="flex items-start mb-4 md:mb-0">
                            <div className="h-16 w-16 relative rounded-lg overflow-hidden mr-4 flex-shrink-0">
                              <Image
                                src={booking.libraryImage}
                                alt={booking.libraryName}
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            </div>

                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {booking.libraryName}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center mb-1">
                                <FiMapPin className="mr-1" /> 
                                {booking.libraryAddress}
                              </p>
                              <p className="text-sm flex items-center mb-1">
                                <FiCalendar className="mr-1 text-gray-400" /> 
                                {formatDate(booking.date)}
                              </p>
                              <p className="text-sm flex items-center">
                                <FiClock className="mr-1 text-gray-400" /> 
                                {booking.timeSlot}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <div className="mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking.status)}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="text-sm mb-2">
                              <span className="text-gray-500">Seats:</span>{' '}
                              <span className="font-medium">{booking.seats.join(', ')}</span>
                              {' • '}
                              <span className="text-gray-500">Type:</span>{' '}
                              <span className="font-medium">{booking.seatType}</span>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <span className="text-gray-500">Booking ID:</span>{' '}
                              <span className="font-medium">{booking.id}</span>
                              {' • '}
                              <span className="text-gray-500">Price:</span>{' '}
                              <span className="font-medium">${booking.price.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex space-x-2">
                              {booking.status === 'upcoming' && (
                                <button
                                  onClick={() => handleCancelBooking(booking.id, 'Seat')}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Cancel Booking
                                </button>
                              )}
                              
                              <Link
                                href={`/booking-confirmation?bookingId=${booking.id}`}
                                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                              >
                                View Details <FiArrowRight className="ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No seat reservations found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Book a seat at your favorite library to get started'}
                  </p>
                  <Link href="/libraries" className="btn btn-primary">
                    Browse Libraries
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'books' && (
            <div>
              {filteredData.books.length > 0 ? (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {filteredData.books.map((book) => (
                      <div key={book.id} className="p-6 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div className="flex items-start mb-4 md:mb-0">
                            <div className="h-24 w-16 relative rounded-lg overflow-hidden mr-4 flex-shrink-0">
                              <Image
                                src={book.bookImage}
                                alt={book.bookTitle}
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            </div>

                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {book.bookTitle}
                              </h3>
                              <p className="text-sm text-gray-500 mb-1">
                                by {book.bookAuthor}
                              </p>
                              <p className="text-sm mb-1">
                                <span className="text-gray-500">Library:</span>{' '}
                                {book.libraryName}
                              </p>
                              <p className="text-sm">
                                <span className="text-gray-500">Borrowed:</span>{' '}
                                {formatDate(book.borrowDate)}
                                {' • '}
                                <span className="text-gray-500">Due:</span>{' '}
                                {formatDate(book.dueDate)}
                              </p>
                              {book.status === 'returned' && (
                                <p className="text-sm">
                                  <span className="text-gray-500">Returned:</span>{' '}
                                  {formatDate(book.returnDate)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <div className="mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(book.status)}`}>
                                {book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <span className="text-gray-500">Booking ID:</span>{' '}
                              <span className="font-medium">{book.id}</span>
                            </div>
                            
                            <div className="flex space-x-2">
                              {(book.status === 'ongoing' || book.status === 'overdue') && (
                                <>
                                  <button
                                    onClick={() => handleRenewBook(book.id)}
                                    className="text-primary-600 hover:text-primary-800 text-sm"
                                  >
                                    Renew
                                  </button>
                                  
                                  <button
                                    onClick={() => handleReturnBook(book.id)}
                                    className="text-green-600 hover:text-green-800 text-sm"
                                  >
                                    Mark as Returned
                                  </button>
                                </>
                              )}
                              
                              <Link
                                href={`/books/${book.bookId}`}
                                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                              >
                                Book Details <FiArrowRight className="ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No borrowed books found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Browse books and borrow them to see them here'}
                  </p>
                  <Link href="/books" className="btn btn-primary">
                    Browse Books
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'events' && (
            <div>
              {filteredData.events.length > 0 ? (
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {filteredData.events.map((event) => (
                      <div key={event.id} className="p-6 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                          <div className="flex items-start mb-4 md:mb-0">
                            <div className="h-16 w-24 relative rounded-lg overflow-hidden mr-4 flex-shrink-0">
                              <Image
                                src={event.eventImage}
                                alt={event.eventTitle}
                                fill
                                style={{ objectFit: 'cover' }}
                              />
                            </div>

                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {event.eventTitle}
                              </h3>
                              <p className="text-sm text-gray-500 mb-1">
                                at {event.libraryName}
                              </p>
                              <p className="text-sm flex items-center mb-1">
                                <FiCalendar className="mr-1 text-gray-400" /> 
                                {formatDate(event.eventDate)}
                              </p>
                              <p className="text-sm flex items-center">
                                <FiClock className="mr-1 text-gray-400" /> 
                                {event.eventTime}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <div className="mb-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(event.status)}`}>
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </span>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <span className="text-gray-500">Registration ID:</span>{' '}
                              <span className="font-medium">{event.id}</span>
                              {event.status === 'completed' && (
                                <>
                                  {' • '}
                                  <span className="text-gray-500">Attended:</span>{' '}
                                  <span className="font-medium">{event.attended ? 'Yes' : 'No'}</span>
                                </>
                              )}
                            </div>
                            
                            <div className="flex space-x-2">
                              {event.status === 'upcoming' && (
                                <button
                                  onClick={() => handleCancelBooking(event.id, 'Event')}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Cancel Registration
                                </button>
                              )}
                              
                              <Link
                                href={`/events/${event.eventId}`}
                                className="text-primary-600 hover:text-primary-800 text-sm flex items-center"
                              >
                                Event Details <FiArrowRight className="ml-1" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow-sm rounded-lg p-8 text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No event registrations found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || statusFilter !== 'all'
                      ? 'Try adjusting your search or filter'
                      : 'Register for library events to see them here'}
                  </p>
                  <Link href="/events" className="btn btn-primary">
                    Browse Events
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;