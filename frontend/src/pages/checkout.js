import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { FiCreditCard, FiChevronRight, FiCheck, FiArrowLeft, FiShield, FiTag, FiPercent } from 'react-icons/fi';
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

// Promo codes data (would come from API in production)
const promoCodes = {
  'WELCOME10': { discount: 0.1, type: 'percentage', description: '10% off on your first booking' },
  'SUMMER25': { discount: 0.25, type: 'percentage', description: '25% off on summer bookings' },
  'FLAT5': { discount: 5, type: 'fixed', description: '$5 off on your booking' },
};

const CheckoutPage = () => {
  const router = useRouter();
  const { libraryId, seatType, date, timeSlot, seats, price } = router.query;
  const { user, isAuthenticated } = useAuth();
  
  const [bookingDetails, setBookingDetails] = useState({
    libraryId: '',
    seatType: '',
    date: '',
    timeSlot: '',
    seats: [],
    price: 0,
  });
  
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const [cardDetails, setCardDetails] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  
  // Set initial booking details from URL params
  useEffect(() => {
    if (router.isReady) {
      // Redirect if not authenticated
      if (!isAuthenticated) {
        router.push('/login?redirect=checkout');
        return;
      }
      
      // Set booking details from URL params
      setBookingDetails({
        libraryId: libraryId || '',
        seatType: seatType || '',
        date: date || '',
        timeSlot: timeSlot || '',
        seats: seats ? seats.split(',') : [],
        price: price ? parseFloat(price) : 0,
      });
    }
  }, [router.isReady, libraryId, seatType, date, timeSlot, seats, price, isAuthenticated, router]);
  
  // Apply promo code
  const applyPromoCode = () => {
    setIsApplyingPromo(true);
    setPromoError('');
    
    // Simulate API call delay
    setTimeout(() => {
      const promo = promoCodes[promoCode];
      
      if (!promo) {
        setPromoError('Invalid promo code');
        setIsApplyingPromo(false);
        return;
      }
      
      setAppliedPromo({
        code: promoCode,
        ...promo
      });
      
      setIsApplyingPromo(false);
    }, 1000);
  };
  
  // Remove applied promo code
  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };
  
  // Calculate discount amount
  const calculateDiscount = () => {
    if (!appliedPromo) return 0;
    
    if (appliedPromo.type === 'percentage') {
      return bookingDetails.price * appliedPromo.discount;
    } else {
      return Math.min(appliedPromo.discount, bookingDetails.price);
    }
  };
  
  // Calculate final price
  const calculateFinalPrice = () => {
    const discount = calculateDiscount();
    return Math.max(0, bookingDetails.price - discount);
  };
  
  // Handle payment form change
  const handleCardDetailsChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Process payment
  const processPayment = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentSuccess(true);
      setIsProcessing(false);
    }, 2000);
  };
  
  // Continue to confirmation
  const continueToConfirmation = () => {
    router.push({
      pathname: '/booking-confirmation',
      query: {
        bookingId: 'BK' + Math.floor(Math.random() * 1000000),
        ...bookingDetails,
        finalPrice: calculateFinalPrice(),
      }
    });
  };

  // If the page is still loading (client-side navigation)
  if (router.isFallback || !router.isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If payment was successful, show success message and redirect button
  if (paymentSuccess) {
    return (
      <>
        <Head>
          <title>Payment Successful | LibraryBooking</title>
          <meta name="description" content="Your payment has been processed successfully" />
        </Head>
        
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-md mx-auto bg-white shadow-card rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiCheck className="text-green-500 text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-600">
                Your booking has been confirmed. You can view your booking details in your dashboard.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-medium">BK{Math.floor(Math.random() * 1000000)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Library:</span>
                <span className="font-medium">{libraryData[bookingDetails.libraryId]?.name}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {bookingDetails.date ? new Date(bookingDetails.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{timeSlots[bookingDetails.timeSlot]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium">${calculateFinalPrice().toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Link href="/dashboard" className="btn btn-outline">
                Go to Dashboard
              </Link>
              <button 
                onClick={continueToConfirmation} 
                className="btn btn-primary"
              >
                View Booking Details
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout | LibraryBooking</title>
        <meta name="description" content="Complete your booking payment" />
      </Head>

      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="text-primary-600 hover:text-primary-700 flex items-center"
            >
              <FiArrowLeft className="mr-1" /> Back to Seat Selection
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Order Summary Section */}
              <div className="bg-white rounded-lg shadow-card p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
                
                <div className="flex items-start mb-4">
                  <div className="h-16 w-16 relative rounded-lg overflow-hidden mr-4">
                    <Image
                      src={
                        libraryData[bookingDetails.libraryId]?.image ||
                        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da'
                      }
                      alt={
                        libraryData[bookingDetails.libraryId]?.name || 'Library'
                      }
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium">{libraryData[bookingDetails.libraryId]?.name}</h3>
                    <p className="text-gray-500 text-sm">{libraryData[bookingDetails.libraryId]?.address}</p>
                    <p className="text-sm mt-1">
                      <span className="text-gray-600">Date:</span>{' '}
                      <span className="font-medium">
                        {bookingDetails.date ? new Date(bookingDetails.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '-'}
                      </span>
                      {' • '}
                      <span className="text-gray-600">Time:</span>{' '}
                      <span className="font-medium">{timeSlots[bookingDetails.timeSlot]}</span>
                    </p>
                  </div>
                </div>
                
                <div className="border-t border-b py-4 my-4">
                  <h3 className="font-medium mb-3">Seats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {bookingDetails.seats.map((seatId, index) => (
                      <div key={index} className="bg-gray-100 rounded p-2 text-center">
                        <span className="font-medium">{seatId}</span>
                        <span className="block text-xs text-gray-500">
                          {seatTypes[bookingDetails.seatType]?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Seat Type:</span>
                    <span>{seatTypes[bookingDetails.seatType]?.name}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Price per seat:</span>
                    <span>${seatTypes[bookingDetails.seatType]?.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Number of seats:</span>
                    <span>{bookingDetails.seats.length}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Subtotal:</span>
                    <span>${bookingDetails.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="bg-white rounded-lg shadow-card p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Promo Code</h2>
                
                {!appliedPromo ? (
                  <div className="flex">
                    <div className="relative flex-grow mr-2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiTag className="text-gray-400" />
                      </div>
                      <input 
                        type="text"
                        className="form-input pl-10 w-full uppercase"
                        placeholder="Enter promo code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <button
                      onClick={applyPromoCode}
                      disabled={!promoCode || isApplyingPromo}
                      className={`btn btn-primary ${!promoCode || isApplyingPromo ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isApplyingPromo ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <FiPercent className="text-green-500 mr-2" />
                        <span className="font-medium">{appliedPromo.code}</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">{appliedPromo.description}</p>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
                
                {promoError && (
                  <div className="text-red-500 text-sm mt-2">
                    {promoError}
                  </div>
                )}
                
                <div className="text-sm text-gray-500 mt-3 flex items-center">
                  <FiInfo className="mr-1" />
                  Use promo code WELCOME10 for 10% off on your first booking
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-white rounded-lg shadow-card p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
                
                <div className="flex space-x-4 mb-6">
                  <div
                    className={`border rounded-lg p-4 flex-1 cursor-pointer ${
                      paymentMethod === 'card' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                        paymentMethod === 'card' ? 'border-primary-500' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'card' && (
                          <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                        )}
                      </div>
                      <div>
                        <FiCreditCard className="text-gray-600" />
                      </div>
                      <span className="ml-2 font-medium">Credit / Debit Card</span>
                    </div>
                  </div>
                  
                  <div
                    className={`border rounded-lg p-4 flex-1 cursor-pointer ${
                      paymentMethod === 'upi' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${
                        paymentMethod === 'upi' ? 'border-primary-500' : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'upi' && (
                          <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                        )}
                      </div>
                      <span className="font-medium">UPI</span>
                    </div>
                  </div>
                </div>
                
                {paymentMethod === 'card' && (
                  <form onSubmit={processPayment}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <label htmlFor="card-number" className="form-label">Card Number</label>
                        <input
                          type="text"
                          id="card-number"
                          name="number"
                          className="form-input"
                          placeholder="1234 5678 9012 3456"
                          value={cardDetails.number}
                          onChange={handleCardDetailsChange}
                          required
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label htmlFor="card-name" className="form-label">Cardholder Name</label>
                        <input
                          type="text"
                          id="card-name"
                          name="name"
                          className="form-input"
                          placeholder="John Doe"
                          value={cardDetails.name}
                          onChange={handleCardDetailsChange}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="card-expiry" className="form-label">Expiry Date</label>
                        <input
                          type="text"
                          id="card-expiry"
                          name="expiry"
                          className="form-input"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={handleCardDetailsChange}
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="card-cvv" className="form-label">CVV</label>
                        <input
                          type="text"
                          id="card-cvv"
                          name="cvv"
                          className="form-input"
                          placeholder="123"
                          value={cardDetails.cvv}
                          onChange={handleCardDetailsChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-6">
                      <FiShield className="mr-2" />
                      Your payment information is secure and encrypted
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`btn btn-primary w-full ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? 'Processing...' : `Pay $${calculateFinalPrice().toFixed(2)}`}
                    </button>
                  </form>
                )}
                
                {paymentMethod === 'upi' && (
                  <div>
                    <div className="mb-4">
                      <label htmlFor="upi-id" className="form-label">UPI ID</label>
                      <input
                        type="text"
                        id="upi-id"
                        className="form-input"
                        placeholder="name@upi"
                        required
                      />
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-6">
                      <FiShield className="mr-2" />
                      Your payment information is secure and encrypted
                    </div>
                    
                    <button
                      onClick={processPayment}
                      disabled={isProcessing}
                      className={`btn btn-primary w-full ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isProcessing ? 'Processing...' : `Pay $${calculateFinalPrice().toFixed(2)}`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Total Section */}
            <div>
              <div className="bg-white rounded-lg shadow-card p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                
                <div className="border-b pb-4 mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${bookingDetails.price.toFixed(2)}</span>
                  </div>
                  
                  {appliedPromo && (
                    <div className="flex justify-between mb-2 text-green-600">
                      <span>Discount ({appliedPromo.code}):</span>
                      <span>-${calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between text-lg font-semibold mb-6">
                  <span>Total:</span>
                  <span>${calculateFinalPrice().toFixed(2)}</span>
                </div>
                
                <div className="text-sm text-gray-500 mb-6">
                  By proceeding with this booking, you agree to our{' '}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                    Privacy Policy
                  </Link>.
                </div>
                
                <button
                  onClick={processPayment}
                  disabled={isProcessing}
                  className={`btn btn-primary w-full ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? 'Processing...' : `Pay $${calculateFinalPrice().toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage;