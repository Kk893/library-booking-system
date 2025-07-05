import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EditBookModal = ({ isOpen, onClose, onSuccess, book }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    language: '',
    synopsis: '',
    totalCopies: 1,
    borrowPolicy: {
      maxDays: 14,
      fine: 5,
      reservationFee: 0
    }
  });

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        genre: book.genre || '',
        language: book.language || '',
        synopsis: book.synopsis || '',
        totalCopies: book.totalCopies || 1,
        borrowPolicy: book.borrowPolicy || { maxDays: 14, fine: 5, reservationFee: 0 }
      });
    }
  }, [book]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/books/${book._id}`, formData);
      toast.success('Book updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update book');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Book Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="input-field"
            required
          />
          
          <input
            type="text"
            placeholder="Author"
            value={formData.author}
            onChange={(e) => setFormData({...formData, author: e.target.value})}
            className="input-field"
            required
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="ISBN"
              value={formData.isbn}
              onChange={(e) => setFormData({...formData, isbn: e.target.value})}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Genre"
              value={formData.genre}
              onChange={(e) => setFormData({...formData, genre: e.target.value})}
              className="input-field"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Language"
              value={formData.language}
              onChange={(e) => setFormData({...formData, language: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="number"
              placeholder="Total Copies"
              value={formData.totalCopies}
              onChange={(e) => setFormData({...formData, totalCopies: parseInt(e.target.value)})}
              className="input-field"
              min="1"
              required
            />
          </div>
          
          <textarea
            placeholder="Synopsis (optional)"
            value={formData.synopsis}
            onChange={(e) => setFormData({...formData, synopsis: e.target.value})}
            className="input-field"
            rows="3"
          />
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Borrowing Policy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Max Days</label>
                <input
                  type="number"
                  value={formData.borrowPolicy.maxDays}
                  onChange={(e) => setFormData({
                    ...formData,
                    borrowPolicy: { ...formData.borrowPolicy, maxDays: parseInt(e.target.value) }
                  })}
                  className="input-field"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fine (₹/day)</label>
                <input
                  type="number"
                  value={formData.borrowPolicy.fine}
                  onChange={(e) => setFormData({
                    ...formData,
                    borrowPolicy: { ...formData.borrowPolicy, fine: parseInt(e.target.value) }
                  })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Reservation Fee (₹)</label>
                <input
                  type="number"
                  value={formData.borrowPolicy.reservationFee}
                  onChange={(e) => setFormData({
                    ...formData,
                    borrowPolicy: { ...formData.borrowPolicy, reservationFee: parseInt(e.target.value) }
                  })}
                  className="input-field"
                  min="0"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
            <button type="submit" className="btn-primary flex-1 py-2 sm:py-3 text-sm sm:text-base">
              Update Book
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 sm:py-3 text-sm sm:text-base">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookModal;