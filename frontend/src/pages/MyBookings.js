import React from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import { format } from 'date-fns';
import QRCode from 'qrcode.react';

const MyBookings = () => {
  const { data: bookings, isLoading } = useQuery(
    'my-bookings',
    () => axios.get('/api/bookings/my-bookings').then(res => res.data)
  );

  if (isLoading) return <div className="text-center">Loading bookings...</div>;

  const seatBookings = bookings?.filter(b => b.type === 'seat') || [];
  const bookBookings = bookings?.filter(b => b.type === 'book') || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Bookings</h1>

      {/* Seat Bookings */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Seat Reservations</h2>
        {seatBookings.length === 0 ? (
          <p className="text-gray-500">No seat bookings found.</p>
        ) : (
          <div className="space-y-4">
            {seatBookings.map(booking => (
              <div key={booking._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{booking.libraryId.name}</h3>
                    <p className="text-sm text-gray-600">
                      {booking.libraryId.city}, {booking.libraryId.area}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Seats: {booking.seatNumbers.join(', ')}</p>
                      <p>Date: {format(new Date(booking.date), 'PPP')}</p>
                      <p>Time: {booking.timeSlot.name}</p>
                      <p>Amount: ₹{booking.amount}</p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {booking.status === 'confirmed' && booking.qrCode && (
                    <div className="ml-4">
                      <QRCode value={booking.qrCode} size={80} />
                      <p className="text-xs text-center mt-1">Entry QR</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Bookings */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Book Reservations</h2>
        {bookBookings.length === 0 ? (
          <p className="text-gray-500">No book reservations found.</p>
        ) : (
          <div className="space-y-4">
            {bookBookings.map(booking => (
              <div key={booking._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{booking.bookId?.title}</h3>
                    <p className="text-sm text-gray-600">by {booking.bookId?.author}</p>
                    <p className="text-sm text-gray-600">{booking.libraryId.name}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Borrow Date: {format(new Date(booking.borrowDate), 'PPP')}</p>
                      <p>Return Date: {format(new Date(booking.returnDate), 'PPP')}</p>
                      {booking.amount > 0 && <p>Fee: ₹{booking.amount}</p>}
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;