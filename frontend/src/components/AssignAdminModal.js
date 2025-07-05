import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const AssignAdminModal = ({ isOpen, onClose, onSuccess, library }) => {
  const [selectedAdminId, setSelectedAdminId] = useState('');

  const { data: allAdmins } = useQuery(
    'all-admins-for-assign',
    () => axios.get('/api/admin/admins').then(res => res.data),
    { enabled: isOpen }
  );
  
  const admins = allAdmins?.filter(admin => !admin.libraryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminId) {
      toast.error('Please select an admin');
      return;
    }

    try {
      await axios.patch(`/api/admin/libraries/${library._id}/assign-admin`, {
        adminId: selectedAdminId
      });
      toast.success('Admin assigned successfully!');
      onSuccess();
      onClose();
      setSelectedAdminId('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign admin');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Assign Admin to {library?.name}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Admin
            </label>
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Choose an admin...</option>
              {admins?.map(admin => (
                <option key={admin._id} value={admin._id}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </select>
          </div>
          
          {(!admins || admins.length === 0) && (
            <p className="text-sm text-gray-500">
              No available admins to assign. Create a new admin first.
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4">
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={!selectedAdminId || !admins || admins.length === 0}
            >
              Assign Admin
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

export default AssignAdminModal;