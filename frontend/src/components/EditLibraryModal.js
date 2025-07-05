import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const EditLibraryModal = ({ isOpen, onClose, onSuccess, library }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    area: '',
    pincode: '',
    phone: '',
    email: '',
    openingHours: { open: '09:00', close: '21:00' },
    facilities: [],
    seatLayout: {
      regular: { count: 20, price: 50 },
      ac: { count: 15, price: 80 },
      premium: { count: 10, price: 120 }
    }
  });

  useEffect(() => {
    if (library) {
      setFormData({
        name: library.name || '',
        address: library.address || '',
        city: library.city || '',
        area: library.area || '',
        pincode: library.pincode || '',
        phone: library.phone || '',
        email: library.email || '',
        openingHours: library.openingHours || { open: '09:00', close: '21:00' },
        facilities: library.facilities || [],
        seatLayout: library.seatLayout || {
          regular: { count: 20, price: 50 },
          ac: { count: 15, price: 80 },
          premium: { count: 10, price: 120 }
        }
      });
    }
  }, [library]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/superadmin/libraries/${library._id}`, formData);
      toast.success('🏢 Library updated successfully!');
      onClose();
      onSuccess();
    } catch (error) {
      toast.error('Failed to update library');
    }
  };

  const handleFacilityChange = (facility, checked) => {
    if (checked) {
      setFormData({...formData, facilities: [...formData.facilities, facility]});
    } else {
      setFormData({...formData, facilities: formData.facilities.filter(f => f !== facility)});
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto animate-fade-in">
      <div className={`rounded-2xl p-6 w-full max-w-2xl mx-4 my-8 transform transition-all duration-500 animate-scale-in ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          Edit Library
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Library Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              required
            />
            <input
              type="text"
              placeholder="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({...formData, pincode: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
          </div>
          
          <textarea
            placeholder="Full Address"
            value={formData.address}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            className={`w-full px-4 py-2 rounded-lg border ${
              isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
            rows="2"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              required
            />
            <input
              type="text"
              placeholder="Area"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              required
            />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Opening Time</label>
              <input
                type="time"
                value={formData.openingHours.open}
                onChange={(e) => setFormData({...formData, openingHours: {...formData.openingHours, open: e.target.value}})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Closing Time</label>
              <input
                type="time"
                value={formData.openingHours.close}
                onChange={(e) => setFormData({...formData, openingHours: {...formData.openingHours, close: e.target.value}})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Facilities</label>
            <div className="grid grid-cols-3 gap-2">
              {['WiFi', 'AC', 'Parking', 'Cafeteria', 'Lockers', 'Printer'].map((facility) => (
                <label key={facility} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.facilities.includes(facility)}
                    onChange={(e) => handleFacilityChange(facility, e.target.checked)}
                    className="mr-2"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{facility}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Seat Configuration</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Regular Seats</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.regular.count}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, regular: {...formData.seatLayout.regular, count: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.seatLayout.regular.price}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, regular: {...formData.seatLayout.regular, price: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>AC Seats</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.ac.count}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, ac: {...formData.seatLayout.ac, count: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.seatLayout.ac.price}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, ac: {...formData.seatLayout.ac, price: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Premium Seats</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={formData.seatLayout.premium.count}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, premium: {...formData.seatLayout.premium, count: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.seatLayout.premium.price}
                    onChange={(e) => setFormData({...formData, seatLayout: {...formData.seatLayout, premium: {...formData.seatLayout.premium, price: parseInt(e.target.value) || 0}}})}
                    className={`w-full px-2 py-1 text-sm rounded border ${
                      isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold"
            >
              Update Library
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9) translateY(-20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EditLibraryModal;