import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const SeatManagement = ({ libraryId, isAdmin = false }) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [showAddSeat, setShowAddSeat] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newSeat, setNewSeat] = useState({
    seatNumber: '',
    seatType: 'regular',
    price: 100,
    position: { row: 1, column: 1 }
  });

  useEffect(() => {
    fetchSeats();
  }, [libraryId]);

  const fetchSeats = async () => {
    try {
      const endpoint = user.role === 'superadmin' 
        ? `/api/seats/superadmin/all`
        : `/api/seats/admin/library/${libraryId}`;
      
      const response = await axios.get(endpoint);
      setSeats(response.data);
    } catch (error) {
      console.error('Error fetching seats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeat = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/seats/admin/library/${libraryId}`, newSeat);
      toast.success('🪑 Seat added successfully!');
      setShowAddSeat(false);
      setNewSeat({
        seatNumber: '',
        seatType: 'regular',
        price: 100,
        position: { row: 1, column: 1 }
      });
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add seat');
    }
  };

  const handleBlockSeat = async (seatId, isBlocked) => {
    try {
      const reason = isBlocked ? prompt('Enter block reason:') : null;
      if (isBlocked && !reason) return;

      await axios.patch(`/api/seats/admin/${seatId}/block`, {
        isBlocked,
        blockReason: reason
      });
      
      toast.success(`Seat ${isBlocked ? 'blocked' : 'unblocked'} successfully!`);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update seat');
    }
  };

  const handleDeleteSeat = async (seatId) => {
    if (window.confirm('Are you sure you want to delete this seat?')) {
      try {
        await axios.delete(`/api/seats/admin/${seatId}`);
        toast.success('🗑️ Seat deleted successfully!');
        fetchSeats();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete seat');
      }
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedSeats.length === 0) {
      toast.error('Please select seats first');
      return;
    }

    try {
      let data = {};
      
      if (action === 'block') {
        const reason = prompt('Enter block reason:');
        if (!reason) return;
        data.reason = reason;
      } else if (action === 'updatePrice') {
        const price = prompt('Enter new price:');
        if (!price || isNaN(price)) return;
        data.price = parseFloat(price);
      }

      await axios.post('/api/seats/superadmin/bulk-action', {
        action,
        seatIds: selectedSeats,
        data
      });

      toast.success(`Bulk ${action} completed successfully!`);
      setSelectedSeats([]);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk action failed');
    }
  };

  const handleGenerateSeats = async () => {
    const rows = parseInt(prompt('Enter number of rows:', '5'));
    const columns = parseInt(prompt('Enter number of columns:', '6'));
    
    if (!rows || !columns) return;

    try {
      await axios.post(`/api/seats/superadmin/generate/${libraryId}`, {
        rows,
        columns,
        seatTypes: [
          { type: 'regular', price: 100 },
          { type: 'ac', price: 150 },
          { type: 'premium', price: 200 }
        ]
      });

      toast.success(`Generated ${rows * columns} seats successfully!`);
      fetchSeats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate seats');
    }
  };

  const getSeatColor = (seat) => {
    if (seat.isBlocked) return 'bg-red-500';
    if (seat.seatType === 'premium') return 'bg-yellow-500';
    if (seat.seatType === 'ac') return 'bg-blue-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`p-6 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="animate-pulse">Loading seats...</div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
          🪑 Seat Management
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddSeat(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            + Add Seat
          </button>
          {user.role === 'superadmin' && (
            <>
              <button
                onClick={handleGenerateSeats}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                🎯 Generate Seats
              </button>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                ⚡ Bulk Actions
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && user.role === 'superadmin' && (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center space-x-4">
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Selected: {selectedSeats.length} seats
            </span>
            <button
              onClick={() => handleBulkAction('block')}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
            >
              Block
            </button>
            <button
              onClick={() => handleBulkAction('unblock')}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
            >
              Unblock
            </button>
            <button
              onClick={() => handleBulkAction('updatePrice')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Update Price
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Seats Grid */}
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 mb-6">
        {seats.map((seat) => (
          <div
            key={seat._id}
            className={`relative w-12 h-12 rounded-lg cursor-pointer transition-all hover:scale-110 ${getSeatColor(seat)} ${
              selectedSeats.includes(seat._id) ? 'ring-2 ring-white' : ''
            }`}
            onClick={() => {
              if (user.role === 'superadmin') {
                setSelectedSeats(prev => 
                  prev.includes(seat._id) 
                    ? prev.filter(id => id !== seat._id)
                    : [...prev, seat._id]
                );
              }
            }}
            title={`${seat.seatNumber} - ${seat.seatType} - ₹${seat.price}${seat.isBlocked ? ' (BLOCKED)' : ''}`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{seat.seatNumber}</span>
            </div>
            {seat.isBlocked && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border border-white"></div>
            )}
          </div>
        ))}
      </div>

      {/* Seat Legend */}
      <div className="flex flex-wrap items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Regular</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>AC</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Premium</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Blocked</span>
        </div>
      </div>

      {/* Seats Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Seat</th>
              <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
              <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Price</th>
              <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
              <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {seats.slice(0, 10).map((seat) => (
              <tr key={seat._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {seat.seatNumber}
                </td>
                <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {seat.seatType}
                </td>
                <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  ₹{seat.price}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    seat.isBlocked 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {seat.isBlocked ? '🚫 Blocked' : '✅ Active'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBlockSeat(seat._id, !seat.isBlocked)}
                      className={`px-2 py-1 rounded text-xs ${
                        seat.isBlocked 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                    >
                      {seat.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button
                      onClick={() => handleDeleteSeat(seat._id)}
                      className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Seat Modal */}
      {showAddSeat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Add New Seat
            </h3>
            <form onSubmit={handleAddSeat} className="space-y-4">
              <input
                type="text"
                placeholder="Seat Number (e.g., A1)"
                value={newSeat.seatNumber}
                onChange={(e) => setNewSeat({...newSeat, seatNumber: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <select
                value={newSeat.seatType}
                onChange={(e) => setNewSeat({...newSeat, seatType: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="regular">Regular</option>
                <option value="ac">AC</option>
                <option value="premium">Premium</option>
              </select>
              <input
                type="number"
                placeholder="Price"
                value={newSeat.price}
                onChange={(e) => setNewSeat({...newSeat, price: parseInt(e.target.value)})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Row"
                  value={newSeat.position.row}
                  onChange={(e) => setNewSeat({...newSeat, position: {...newSeat.position, row: parseInt(e.target.value)}})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <input
                  type="number"
                  placeholder="Column"
                  value={newSeat.position.column}
                  onChange={(e) => setNewSeat({...newSeat, position: {...newSeat.position, column: parseInt(e.target.value)}})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold"
                >
                  Add Seat
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSeat(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatManagement;