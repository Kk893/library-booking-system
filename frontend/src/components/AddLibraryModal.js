import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AddLibraryModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    area: '',
    pincode: '',
    address: '',
    phone: '+91-',
    email: '',
    openingHours: { open: '08:00', close: '22:00' },
    facilities: '',
    seatLayout: {
      regular: { count: 50, price: 100 },
      ac: { count: 30, price: 150 },
      premium: { count: 20, price: 200 }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        facilities: formData.facilities.split(',').map(f => f.trim()),
        timeSlots: [
          { name: 'Morning', startTime: '08:00', endTime: '12:00', isActive: true },
          { name: 'Afternoon', startTime: '12:00', endTime: '16:00', isActive: true },
          { name: 'Evening', startTime: '16:00', endTime: '20:00', isActive: true },
          { name: 'Night', startTime: '20:00', endTime: '22:00', isActive: true }
        ]
      };
      
      await axios.post('/api/admin/libraries', data);
      toast.success('Library added successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add library');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add New Library</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
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
          
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Area"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Pincode (6 digits)"
              value={formData.pincode}
              onChange={(e) => setFormData({...formData, pincode: e.target.value})}
              className="input-field"
              pattern="[0-9]{6}"
              maxLength="6"
              required
            />
          </div>
          
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="input-field"
            required
          />
          
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
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Regular Seats</label>
              <input
                type="number"
                placeholder="Count"
                value={formData.seatLayout.regular.count}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    regular: { ...formData.seatLayout.regular, count: parseInt(e.target.value) }
                  }
                })}
                className="input-field mb-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={formData.seatLayout.regular.price}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    regular: { ...formData.seatLayout.regular, price: parseInt(e.target.value) }
                  }
                })}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">AC Seats</label>
              <input
                type="number"
                placeholder="Count"
                value={formData.seatLayout.ac.count}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    ac: { ...formData.seatLayout.ac, count: parseInt(e.target.value) }
                  }
                })}
                className="input-field mb-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={formData.seatLayout.ac.price}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    ac: { ...formData.seatLayout.ac, price: parseInt(e.target.value) }
                  }
                })}
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Premium Seats</label>
              <input
                type="number"
                placeholder="Count"
                value={formData.seatLayout.premium.count}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    premium: { ...formData.seatLayout.premium, count: parseInt(e.target.value) }
                  }
                })}
                className="input-field mb-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={formData.seatLayout.premium.price}
                onChange={(e) => setFormData({
                  ...formData,
                  seatLayout: {
                    ...formData.seatLayout,
                    premium: { ...formData.seatLayout.premium, price: parseInt(e.target.value) }
                  }
                })}
                className="input-field"
              />
            </div>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Add Library
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

export default AddLibraryModal;