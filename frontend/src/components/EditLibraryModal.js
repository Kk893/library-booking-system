import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EditLibraryModal = ({ isOpen, onClose, onSuccess, library }) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    area: '',
    address: '',
    phone: '',
    email: '',
    facilities: '',
    seatLayout: {
      regular: { count: 50, price: 100 },
      ac: { count: 30, price: 150 },
      premium: { count: 20, price: 200 }
    }
  });

  useEffect(() => {
    if (library) {
      setFormData({
        name: library.name || '',
        city: library.city || '',
        area: library.area || '',
        address: library.address || '',
        phone: library.phone || '',
        email: library.email || '',
        facilities: library.facilities?.join(', ') || '',
        seatLayout: library.seatLayout || {
          regular: { count: 50, price: 100 },
          ac: { count: 30, price: 150 },
          premium: { count: 20, price: 200 }
        }
      });
    }
  }, [library]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        facilities: formData.facilities.split(',').map(f => f.trim())
      };
      
      await axios.put(`/api/admin/libraries/${library._id}`, data);
      toast.success('Library updated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update library');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Library</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Library Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="input-field"
              required
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Area"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="input-field"
              required
            />
          </div>
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="input-field"
            required
          />
          
          <textarea
            placeholder="Full Address"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className="input-field"
            rows="2"
            required
          />
          
          <input
            type="text"
            placeholder="Facilities (comma separated)"
            value={formData.facilities}
            onChange={(e) => setFormData({...formData, facilities: e.target.value})}
            className="input-field"
          />
          
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Seat Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2 text-center text-sm">Regular Seats</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.regular.count}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        regular: { ...formData.seatLayout.regular, count: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={formData.seatLayout.regular.price}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        regular: { ...formData.seatLayout.regular, price: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2 text-center text-sm">AC Seats</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.ac.count}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        ac: { ...formData.seatLayout.ac, count: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={formData.seatLayout.ac.price}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        ac: { ...formData.seatLayout.ac, price: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-3">
                <h4 className="font-medium mb-2 text-center text-sm">Premium Seats</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.premium.count}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        premium: { ...formData.seatLayout.premium, count: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={formData.seatLayout.premium.price}
                    onChange={(e) => setFormData({
                      ...formData,
                      seatLayout: {
                        ...formData.seatLayout,
                        premium: { ...formData.seatLayout.premium, price: parseInt(e.target.value) || 0 }
                      }
                    })}
                    className="input-field text-sm"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg mt-4">
              <h4 className="font-medium mb-2 text-sm">Summary</h4>
              <div className="text-xs space-y-1">
                <p>Total Seats: {formData.seatLayout.regular.count + formData.seatLayout.ac.count + formData.seatLayout.premium.count}</p>
                <p>Price Range: ₹{Math.min(formData.seatLayout.regular.price, formData.seatLayout.ac.price, formData.seatLayout.premium.price)} - ₹{Math.max(formData.seatLayout.regular.price, formData.seatLayout.ac.price, formData.seatLayout.premium.price)}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Update Library
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLibraryModal;