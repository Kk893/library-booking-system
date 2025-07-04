import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiClock, FiInfo, FiCalendar, FiArrowLeft, FiArrowRight, FiShoppingCart } from 'react-icons/fi';
import { useAuth } from '../../../contexts/AuthContext';

// Sample data for the seats layout (would come from API in production)
const seatTypeData = {
  1: {
    name: 'Regular Seat',
    price: 5,
    layout: {
      rows: 5,
      cols: 6,
      seats: [
        { id: 'A1', row: 0, col: 0, status: 'available', type: 'regular' },
        { id: 'A2', row: 0, col: 1, status: 'available', type: 'regular' },
        { id: 'A3', row: 0, col: 2, status: 'booked', type: 'regular' },
        { id: 'A4', row: 0, col: 3, status: 'available', type: 'regular' },
        { id: 'A5', row: 0, col: 4, status: 'available', type: 'regular' },
        { id: 'A6', row: 0, col: 5, status: 'available', type: 'regular' },
        { id: 'B1', row: 1, col: 0, status: 'available', type: 'regular' },
        { id: 'B2', row: 1, col: 1, status: 'available', type: 'regular' },
        { id: 'B3', row: 1, col: 2, status: 'available', type: 'regular' },
        { id: 'B4', row: 1, col: 3, status: 'booked', type: 'regular' },
        { id: 'B5', row: 1, col: 4, status: 'booked', type: 'regular' },
        { id: 'B6', row: 1, col: 5, status: 'available', type: 'regular' },
        { id: 'C1', row: 2, col: 0, status: 'available', type: 'regular' },
        { id: 'C2', row: 2, col: 1, status: 'available', type: 'regular' },
        { id: 'C3', row: 2, col: 2, status: 'available', type: 'regular' },
        { id: 'C4', row: 2, col: 3, status: 'available', type: 'regular' },
        { id: 'C5', row: 2, col: 4, status: 'available', type: 'regular' },
        { id: 'C6', row: 2, col: 5, status: 'booked', type: 'regular' },
        { id: 'D1', row: 3, col: 0, status: 'available', type: 'regular' },
        { id: 'D2', row: 3, col: 1, status: 'available', type: 'regular' },
        { id: 'D3', row: 3, col: 2, status: 'available', type: 'regular' },
        { id: 'D4', row: 3, col: 3, status: 'available', type: 'regular' },
        { id: 'D5', row: 3, col: 4, status: 'available', type: 'regular' },
        { id: 'D6', row: 3, col: 5, status: 'available', type: 'regular' },
        { id: 'E1', row: 4, col: 0, status: 'available', type: 'regular' },
        { id: 'E2', row: 4, col: 1, status: 'booked', type: 'regular' },
        { id: 'E3', row: 4, col: 2, status: 'booked', type: 'regular' },
        { id: 'E4', row: 4, col: 3, status: 'available', type: 'regular' },
        { id: 'E5', row: 4, col: 4, status: 'available', type: 'regular' },
        { id: 'E6', row: 4, col: 5, status: 'available', type: 'regular' },
      ]
    }
  },
  2: {
    name: 'AC Cubicle',
    price: 12,
    layout: {
      rows: 2,
      cols: 5,
      seats: [
        { id: 'C1', row: 0, col: 0, status: 'available', type: 'cubicle' },
        { id: 'C2', row: 0, col: 1, status: 'booked', type: 'cubicle' },
        { id: 'C3', row: 0, col: 2, status: 'available', type: 'cubicle' },
        { id: 'C4', row: 0, col: 3, status: 'available', type: 'cubicle' },
        { id: 'C5', row: 0, col: 4, status: 'available', type: 'cubicle' },
        { id: 'C6', row: 1, col: 0, status: 'available', type: 'cubicle' },
        { id: 'C7', row: 1, col: 1, status: 'available', type: 'cubicle' },
        { id: 'C8', row: 1, col: 2, status: 'booked', type: 'cubicle' },
        { id: 'C9', row: 1, col: 3, status: 'available', type: 'cubicle' },
        { id: 'C10', row: 1, col: 4, status: 'available', type: 'cubicle' },
      ]
    }
  },
  3: {
    name: 'Premium Booth',
    price: 20,
    layout: {
      rows: 1,
      cols: 5,
      seats: [
        { id: 'P1', row: 0, col: 0, status: 'available', type: 'premium' },
        { id: 'P2', row: 0, col: 1, status: 'available', type: 'premium' },
        { id: 'P3', row: 0, col: 2, status: 'booked', type: 'premium' },
        { id: 'P4', row: 0, col: 3, status: 'booked', type: 'premium' },
        { id: 'P5', row: 0, col: 4, status: 'available', type: 'premium' },
      ]
    }
  }
};

// Time slots available for booking
const timeSlots = [
  { id: 1, time: '10:00 AM - 1:00 PM' },
  { id: 2, time: '1:00 PM - 4:00 PM' },
  { id: 3, time: '4:00 PM - 7:00 PM' },
];

// Library data
const libraryData = {
  id: 1,
  name: 'Central City Library',
  address: '123 Main St, Downtown',
  image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
};

const SeatBookingPage = () => {
  const router = useRouter();
  const { libraryId, seatType: initialSeatType, date: initialDate } = router.query;
  const { isAuthenticated } = useAuth();
  
  const [seatType, setSeatType] = useState(initialSeatType || '1');
  const [selectedDate, setSelectedDate] = useState(initialDate || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isLocking, setIsLocking] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [lockInterval, setLockInterval] = useState(null);
  
  // Generate date options for the next 7 days
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  // Set initial date if not selected
  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].value);
    }
  }, []);

  // Update seat type when URL param changes
  useEffect(() => {
    if (initialSeatType) {
      setSeatType(initialSeatType);
    }
  }, [initialSeatType]);

  // Update date when URL param changes
  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Cleanup lock interval on unmount
  useEffect(() => {
    return () => {
      if (lockInterval) clearInterval(lockInterval);
    };
  }, [lockInterval]);

  // Handle seat selection
  const handleSeatClick = (seat) => {
    if (seat.status === 'booked') return; // Can't select already booked seats
    
    setSelectedSeats(prev => {
      // If already selected, remove it
      if (prev.some(s => s.id === seat.id)) {
        return prev.filter(s => s.id !== seat.id);
      } 
      // Otherwise add it
      return [...prev, seat];
    });
  };

  // Lock the selected seats for 5 minutes
  const lockSeats = () => {
    if (!selectedTimeSlot) {
      alert('Please select a time slot');
      return;
    }
    
    if (selectedSeats.length === 0) {
      alert('Please select at least one seat');
      return;
    }
    
    setIsLocking(true);
    setLockTimeRemaining(5 * 60); // 5 minutes in seconds
    
    const interval = setInterval(() => {
      setLockTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocking(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setLockInterval(interval);
  };

  // Format the lock time remaining
  const formatLockTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate total price
  const totalPrice = selectedSeats.length * seatTypeData[seatType]?.price || 0;

  // Proceed to checkout
  const proceedToCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=checkout');
      return;
    }
    
    router.push({
      pathname: '/checkout',
      query: {
        libraryId,
        seatType,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        seats: selectedSeats.map(s => s.id).join(','),
        price: totalPrice
      }
    });
  };

  // If the page is still loading (client-side navigation)
  if (router.isFallback) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Get the current seat layout
  const currentLayout = seatTypeData[seatType]?.layout || { rows: 0, cols: 0, seats: [] };

  return (
    <>
      <Head>
        <title>Book Seats | {libraryData.name} | LibraryBooking</title>
        <meta name="description" content={`Book your seat at ${libraryData.name}`} />
      </Head>

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Header Section */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link 
                href={`/libraries/${libraryId}`}
                className="text-primary-600 hover:text-primary-700 flex items-center mr-4"
              >
                <FiArrowLeft className="mr-1" /> Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Book Seats</h1>
            </div>
            <div className="flex items-center mt-2">
              <div className="relative h-48 w-full">
                <Image
                  src={library.image}
                  alt={library.name}
                  fill
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div>
                <p className="font-medium">{libraryData.name}</p>
                <p className="text-gray-500 text-sm">{libraryData.address}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Booking Controls */}
              <div className="bg-white rounded-lg shadow-card p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Seat Type Selector */}
                  <div>
                    <label htmlFor="seat-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Seat Type
                    </label>
                    <select
                      id="seat-type"
                      className="form-input w-full"
                      value={seatType}
                      onChange={(e) => {
                        setSeatType(e.target.value);
                        setSelectedSeats([]);
                      }}
                    >
                      {Object.entries(seatTypeData).map(([id, data]) => (
                        <option key={id} value={id}>
                          {data.name} (${data.price}/day)
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Date Selector */}
                  <div>
                    <label htmlFor="booking-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <select
                      id="booking-date"
                      className="form-input w-full"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    >
                      <option value="">Select a date</option>
                      {dateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Time Slot Selector */}
                  <div>
                    <label htmlFor="time-slot" className="block text-sm font-medium text-gray-700 mb-1">
                      Time Slot
                    </label>
                    <select
                      id="time-slot"
                      className="form-input w-full"
                      value={selectedTimeSlot}
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    >
                      <option value="">Select a time slot</option>
                      {timeSlots.map((slot) => (
                        <option key={slot.id} value={slot.id}>
                          {slot.time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-2">
                  <div className="flex items-center">
                    <div className="w-6 h-6 seat-available mr-2"></div>
                    <span className="text-sm">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 seat-selected mr-2"></div>
                    <span className="text-sm">Selected</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 seat-booked mr-2"></div>
                    <span className="text-sm">Booked</span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 flex items-center mb-4">
                  <FiInfo className="mr-1" /> 
                  Click on an available seat to select it
                </div>
              </div>

              {/* Seat Layout */}
              <div className="bg-white rounded-lg shadow-card p-6 mb-6">
                <h2 className="text-lg font-semibold mb-6 text-center">Seat Layout</h2>
                
                <div className="flex justify-center mb-6">
                  <div className="bg-gray-100 p-2 rounded-lg text-center text-gray-800 text-sm font-medium w-2/3">
                    Entrance
                  </div>
                </div>
                
                <div className="flex justify-center mb-8">
                  <div 
                    className="grid gap-3"
                    style={{ 
                      gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${currentLayout.rows}, minmax(0, 1fr))`
                    }}
                  >
                    {currentLayout.seats.map((seat) => (
                      <button
                        key={seat.id}
                        onClick={() => handleSeatClick(seat)}
                        disabled={seat.status === 'booked' || isLocking}
                        className={`
                          seat 
                          ${seat.status === 'booked' ? 'seat-booked' : ''} 
                          ${selectedSeats.some(s => s.id === seat.id) ? 'seat-selected' : 'seat-available'}
                          ${seat.type === 'premium' ? 'seat-premium' : ''}
                        `}
                        style={{ 
                          gridColumn: seat.col + 1, 
                          gridRow: seat.row + 1,
                          width: seat.type === 'premium' ? '50px' : '40px',
                          height: seat.type === 'premium' ? '50px' : '40px',
                        }}
                        title={`Seat ${seat.id}`}
                      >
                        {seat.id}
                      </button>
                    ))}
                  </div>
                </div>
                
                {selectedSeats.length > 0 && !isLocking && (
                  <div className="flex justify-center">
                    <button
                      onClick={lockSeats}
                      className="btn btn-primary"
                    >
                      Lock Selected Seats for 5 Minutes
                    </button>
                  </div>
                )}
                
                {isLocking && (
                  <div className="text-center">
                    <div className="text-lg font-semibold mb-2">
                      Seats locked for {formatLockTime(lockTimeRemaining)}
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                      Complete your booking before the timer expires or the seats will be released
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-lg shadow-card p-6 sticky top-4">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                
                <div className="border-b pb-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Library:</span>
                    <span className="font-medium">{libraryData.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Seat Type:</span>
                    <span className="font-medium">{seatTypeData[seatType]?.name}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Time Slot:</span>
                    <span className="font-medium">
                      {selectedTimeSlot ? timeSlots.find(s => s.id.toString() === selectedTimeSlot)?.time : '-'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Selected Seats ({selectedSeats.length})</h3>
                  {selectedSeats.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedSeats.map(seat => (
                        <div key={seat.id} className="bg-primary-50 text-primary-700 px-2 py-1 rounded text-sm">
                          {seat.id}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic mb-4">No seats selected</p>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-1">
                    <span>Price per seat:</span>
                    <span>${seatTypeData[seatType]?.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>Number of seats:</span>
                    <span>{selectedSeats.length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold mt-2">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                
                <button
                  onClick={proceedToCheckout}
                  disabled={!isLocking || selectedSeats.length === 0}
                  className={`btn btn-primary w-full mt-6 flex justify-center items-center ${
                    (!isLocking || selectedSeats.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FiShoppingCart className="mr-2" />
                  Proceed to Checkout
                </button>
                
                {!isLocking && selectedSeats.length > 0 && (
                  <p className="text-sm text-center text-gray-500 mt-2">
                    Lock your seats before proceeding to checkout
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SeatBookingPage;