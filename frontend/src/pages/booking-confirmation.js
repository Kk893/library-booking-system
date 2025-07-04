import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiCheckCircle, FiPrinter, FiDownload, FiShare2, FiMail, FiMapPin, FiCalendar, FiClock, FiCreditCard } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

// Sample library data (would come from API in production)
const libraryData = {
  1: {
    id: 1,
    name: 'Central City Library',
    address: '123 Main St, Downtown',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da',
  },
  2: {
    id: 2,
    name: 'Riverside Reading Hub',
    address: '456 River Rd, Westside',
    image: 'https://images.unsplash.com/photo-1568667256549-094345857637',
  },
};

// Time slots data
const timeSlots = {
  1: '10:00 AM - 1:00 PM',
  2: '1:00 PM - 4:00 PM',
  3: '4:00 PM - 7:00 PM',
};

// Seat types data
const seatTypes = {
  1: { name: 'Regular Seat', price: 5 },
  2: { name: 'AC Cubicle', price: 12 },
  3: { name: 'Premium Booth', price: 20 },
};

const BookingConfirmationPage = () => {
  const router = useRouter();
  const { bookingId, libraryId, seatType, date, timeSlot, seats, finalPrice } = router.query;
  const { user, isAuthenticated } = useAuth();
  
  const [bookingDetails, setBookingDetails] = useState({
    bookingId: '',
    libraryId: '',
    seatType: '',
    date: '',
    timeSlot: '',
    seats: [],
    finalPrice: 0,
    bookingDate: new Date().toISOString(),
  });
  
  // QR code data (would normally be generated server-side)
  const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + 
    encodeURIComponent(`BOOKING:${bookingId || 'BK123456'}`);
  
  // Set booking details from URL params
  useEffect(() => {
    if (router.isReady) {
      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push('/login?redirect=/dashboard');
        return;
      }
      
      // Set booking details from URL params
      setBookingDetails({
        bookingId: bookingId || `BK${Math.floor(Math.random() * 1000000)}`,
        libraryId: libraryId || '',
        seatType: seatType || '',
        date: date || '',
        timeSlot: timeSlot || '',
        seats: seats ? seats.split(',') : [],
        finalPrice: finalPrice ? parseFloat(finalPrice) : 0,
        bookingDate: new Date().toISOString(),
      });
    }
  }, [router.isReady, bookingId, libraryId, seatType, date, timeSlot, seats, finalPrice, isAuthenticated, router]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // Handle print receipt
  const handlePrint = () => {
    window.print();
  };
  
  // Handle download receipt (simplified for demo)
  const handleDownload = () => {
    alert('Receipt downloaded (simulated)');
  };
  
  // Handle share receipt (simplified for demo)
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Library Booking #${bookingDetails.bookingId}`,
        text: `My library seat booking at ${libraryData[bookingDetails.libraryId]?.name}`,
        url: window.location.href,
      });
    } else {
      alert('Sharing is not supported on this browser');
    }
  };
  
  // Handle email receipt (simplified for demo)
  const handleEmailReceipt = () => {
    alert(`Receipt sent to ${user?.email || 'your email'} (simulated)`);
  };

  // If the page is still loading (client-side navigation)
  if (router.isFallback || !router.isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Booking Confirmation | LibraryBooking</title>
        <meta name="description" content="Your library seat booking has been confirmed" />
      </Head>

      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <FiCheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-lg text-gray-600">
              Your booking has been successfully confirmed. Show the QR code below at the library entrance.
            </p>
          </div>
          
          {/* Booking Receipt - Printable area */}
          <div className="bg-white rounded-lg shadow-card overflow-hidden mb-8 print:shadow-none" id="printable-receipt">
            {/* Header */}
            <div className="bg-primary-600 text-white p-6 print:bg-white print:text-black">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Booking Receipt</h2>
                <div className="text-sm">
                  <div>Booking ID: {bookingDetails.bookingId}</div>
                  <div>Date: {new Date(bookingDetails.bookingDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {/* Library Info */}
              <div className="flex items-start mb-6">
                <div className="h-16 w-16 relative rounded-lg overflow-hidden mr-4">
                  <Image
                    src={libraryData[bookingDetails.libraryId]?.image || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da'}
                    alt={libraryData[bookingDetails.libraryId]?.name || 'Library'}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{libraryData[bookingDetails.libraryId]?.name}</h3>
                  <p className="text-gray-500 flex items-center">
                    <FiMapPin className="mr-1" /> 
                    {libraryData[bookingDetails.libraryId]?.address}
                  </p>
                </div>
              </div>
              
              {/* Booking Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Date</h3>
                  <p className="flex items-center font-medium">
                    <FiCalendar className="mr-2 text-primary-500" /> 
                    {formatDate(bookingDetails.date)}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Time Slot</h3>
                  <p className="flex items-center font-medium">
                    <FiClock className="mr-2 text-primary-500" /> 
                    {timeSlots[bookingDetails.timeSlot] || '-'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Seat Type</h3>
                  <p className="font-medium">
                    {seatTypes[bookingDetails.seatType]?.name || '-'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Payment</h3>
                  <p className="flex items-center font-medium">
                    <FiCreditCard className="mr-2 text-primary-500" /> 
                    ${bookingDetails.finalPrice?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              
              {/* Seats */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-500 mb-2">Reserved Seats</h3>
                <div className="flex flex-wrap gap-2">
                  {bookingDetails.seats.map((seat, index) => (
                    <div key={index} className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full">
                      {seat}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* QR Code */}
              <div className="flex flex-col items-center mb-6">
                <h3 className="font-medium text-gray-500 mb-3">Entry QR Code</h3>
                <div className="border p-3 rounded-lg bg-white">
                  <img 
                    src={qrCodeUrl} 
                    alt="Booking QR Code" 
                    width={150} 
                    height={150} 
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Scan this QR code at the library entrance
                </p>
              </div>
              
              {/* Terms */}
              <div className="text-xs text-gray-500 border-t pt-4">
                <p className="mb-1"><strong>Cancellation Policy:</strong> Bookings can be cancelled up to 2 hours before the scheduled time slot for a full refund.</p>
                <p><strong>Note:</strong> Please arrive 15 minutes before your scheduled time. Seats will be released if you do not check in within 30 minutes of your scheduled time.</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <button 
              onClick={handlePrint} 
              className="btn btn-outline flex justify-center items-center"
            >
              <FiPrinter className="mr-2" /> Print
            </button>
            
            <button 
              onClick={handleDownload} 
              className="btn btn-outline flex justify-center items-center"
            >
              <FiDownload className="mr-2" /> Download
            </button>
            
            <button 
              onClick={handleShare} 
              className="btn btn-outline flex justify-center items-center"
            >
              <FiShare2 className="mr-2" /> Share
            </button>
            
            <button 
              onClick={handleEmailReceipt} 
              className="btn btn-outline flex justify-center items-center"
            >
              <FiMail className="mr-2" /> Email
            </button>
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between">
            <Link href="/dashboard" className="btn btn-outline">
              My Bookings
            </Link>
            <Link href="/" className="btn btn-primary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingConfirmationPage;