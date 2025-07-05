import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const AddAdminModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+91-',
    password: 'admin123',
    libraryId: ''
  });

  const { data: libraries } = useQuery(
    'libraries-for-admin',
    () => axios.get('/api/libraries').then(res => res.data)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!formData.password.trim()) {
      toast.error('Password is required');
      return;
    }
    
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone && formData.phone !== '+91-' ? formData.phone : undefined,
        libraryId: formData.libraryId || undefined
      };
      
      await axios.post('/api/admin/create-admin', payload);
      toast.success('Admin created successfully!');
      onSuccess();
      onClose();
      setFormData({
        name: '',
        email: '',
        phone: '+91-',
        password: 'admin123',
        libraryId: ''
      });
    } catch (error) {
      console.error('Create admin error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create admin';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Admin</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Admin Name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
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
          
          <input
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="input-field"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="input-field"
            required
          />
          
          <select
            value={formData.libraryId}
            onChange={(e) => setFormData({...formData, libraryId: e.target.value})}
            className="input-field"
          >
            <option value="">Select Library (Optional)</option>
            {libraries?.map(library => (
              <option key={library._id} value={library._id}>
                {library.name} - {library.city}
              </option>
            ))}
          </select>
          
          <div className="flex space-x-4 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Create Admin
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

export default AddAdminModal;