import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const SeatBooking = () => {
  const { libraryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatType, setSeatType] = useState('regular');

  const { data: seatData, isLoading } = useQuery(
    ['seats', libraryId, selectedDate, selectedTimeSlot],
    () => axios.get(`/api/seats/library/${libraryId}/map?date=${selectedDate}&timeSlot=${selectedTimeSlot}`).then(res => res.data),
    { enabled: !!selectedTimeSlot }
  );

  const { data: library } = useQuery(
    ['library', libraryId],
    () => axios.get(`/api/libraries/${libraryId}`).then(res => res.data)
  );

  const handleSeatSelect = (seatNumber) => {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(seat => seat !== seatNumber));
    } else if (selectedSeats.length < 4) { // Max 4 seats
      setSelectedSeats([...selectedSeats, seatNumber]);
    } else {
      toast.error('Maximum 4 seats can be selected');
    }
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    try {
      const timeSlotObj = library.timeSlots.find(slot => slot.name === selectedTimeSlot);
      
      const response = await axios.post('/api/bookings/seats', {
        libraryId,
        seatType,
        seatNumbers: selectedSeats,
        date: selectedDate,
        timeSlot: timeSlotObj
      });

      const { booking, order } = response.data;

      // Razorpay payment
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'LibraryBook',
        description: 'Seat Booking',
        order_id: order.id,
        handler: async (response) => {
          try {
            await axios.post('/api/bookings/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id
            });
            
            toast.success('Booking confirmed successfully!');
            navigate('/my-bookings');
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    }
  };

  const getSeatColor = (seat) => {
    if (seat.status === 'booked') return 'bg-red-500';
    if (selectedSeats.includes(seat.number)) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) return <div className="text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Book Your Seat</h1>
      
      {library && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-2">{library.name}</h2>
          <p className="text-gray-600">{library.city}, {library.area}</p>
        </div>
      )}

      {/* Date and Time Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Date & Time</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Time Slot</label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="input-field"
            >
              <option value="">Select Time Slot</option>
              {library?.timeSlots?.map(slot => (
                <option key={slot.name} value={slot.name}>
                  {slot.name} ({slot.startTime} - {slot.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Seat Type Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Select Seat Type</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {['regular', 'ac', 'premium'].map(type => (
            <button
              key={type}
              onClick={() => setSeatType(type)}
              className={`p-4 border rounded-lg ${
                seatType === type ? 'border-primary-600 bg-primary-50' : 'border-gray-300'
              }`}
            >
              <div className="font-medium capitalize">{type}</div>
              <div className="text-sm text-gray-600">
                ₹{seatData?.pricing?.[type]} per slot
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Seat Map */}
      {seatData && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Select Seats</h3>
          <div className="grid grid-cols-8 gap-2 mb-4">
            {seatData.seatMap[seatType]?.map(seat => (
              <button
                key={seat.number}
                onClick={() => seat.status === 'available' && handleSeatSelect(seat.number)}
                disabled={seat.status === 'booked'}
                className={`w-12 h-12 rounded text-white text-xs font-medium ${getSeatColor(seat)} ${
                  seat.status === 'booked' ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                }`}
              >
                {seat.number.split('-')[1]}
              </button>
            ))}
          </div>
          
          <div className="flex space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              Available
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
              Selected
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              Booked
            </div>
          </div>
        </div>
      )}

      {/* Booking Summary */}
      {selectedSeats.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
          <div className="space-y-2">
            <div>Selected Seats: {selectedSeats.join(', ')}</div>
            <div>Date: {selectedDate}</div>
            <div>Time: {selectedTimeSlot}</div>
            <div className="text-xl font-bold">
              Total: ₹{selectedSeats.length * (seatData?.pricing?.[seatType] || 0)}
            </div>
          </div>
          <button onClick={handleBooking} className="btn-primary w-full mt-4">
            Proceed to Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default SeatBooking;