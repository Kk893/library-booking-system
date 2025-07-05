import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: book, isLoading } = useQuery(
    ['book', id],
    () => axios.get(`/api/books/${id}`).then(res => res.data)
  );

  const handleReserve = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(`/api/books/${id}/reserve`);
      toast.success('Book reserved successfully!');
      navigate('/my-bookings');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reservation failed');
    }
  };

  if (isLoading) return <div className="text-center">Loading...</div>;
  if (!book) return <div className="text-center">Book not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {book.coverImage && (
              <img src={book.coverImage} alt={book.title} className="w-full rounded-lg" />
            )}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold mb-4">{book.title}</h1>
            <p className="text-xl text-gray-600 mb-4">by {book.author}</p>
            
            <div className="space-y-2 mb-6">
              <p><span className="font-medium">Genre:</span> {book.genre}</p>
              <p><span className="font-medium">Language:</span> {book.language}</p>
              <p><span className="font-medium">ISBN:</span> {book.isbn}</p>
              <p><span className="font-medium">Available Copies:</span> {book.availableCopies}/{book.totalCopies}</p>
              <p><span className="font-medium">Library:</span> {book.libraryId.name}</p>
            </div>

            {book.synopsis && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Synopsis</h3>
                <p className="text-gray-700">{book.synopsis}</p>
              </div>
            )}

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Borrowing Policy</h3>
              <div className="text-sm space-y-1">
                <p>Max borrowing period: {book.borrowPolicy.maxDays} days</p>
                <p>Late fee: ₹{book.borrowPolicy.fine} per day</p>
                {book.borrowPolicy.reservationFee > 0 && (
                  <p>Reservation fee: ₹{book.borrowPolicy.reservationFee}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleReserve}
              disabled={book.availableCopies === 0}
              className={`btn-primary w-full ${book.availableCopies === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {book.availableCopies === 0 ? 'Not Available' : 'Reserve Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;