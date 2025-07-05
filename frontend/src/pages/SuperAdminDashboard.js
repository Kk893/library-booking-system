import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalLibraries: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0
  });
  const [libraries, setLibraries] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newLibrary, setNewLibrary] = useState({
    name: '',
    address: '',
    city: '',
    area: '',
    pincode: '',
    phone: '',
    email: '',
    openingHours: { open: '09:00', close: '21:00' }
  });
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, librariesRes, adminsRes] = await Promise.all([
        axios.get('/api/superadmin/stats'),
        axios.get('/api/superadmin/libraries'),
        axios.get('/api/superadmin/admins')
      ]);
      
      setStats(statsRes.data);
      setLibraries(librariesRes.data);
      setAdmins(adminsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLibrary = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/superadmin/libraries', newLibrary);
      toast.success('🏢 Library added successfully!');
      setShowAddLibrary(false);
      setNewLibrary({
        name: '',
        address: '',
        city: '',
        area: '',
        pincode: '',
        phone: '',
        email: '',
        openingHours: { open: '09:00', close: '21:00' }
      });
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to add library');
    }
  };

  const handleDeleteLibrary = async (id) => {
    if (window.confirm('Are you sure you want to delete this library?')) {
      try {
        await axios.delete(`/api/superadmin/libraries/${id}`);
        toast.success('🗑️ Library deleted successfully!');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete library');
      }
    }
  };

  const handleToggleLibraryStatus = async (id, currentStatus) => {
    try {
      await axios.put(`/api/superadmin/libraries/${id}`, { isActive: !currentStatus });
      toast.success(`Library ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update library status');
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/superadmin/admins', newAdmin);
      toast.success('👨‍💼 Admin created successfully!');
      setShowAddAdmin(false);
      setNewAdmin({ name: '', email: '', password: '', role: 'admin' });
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      try {
        await axios.delete(`/api/superadmin/admins/${id}`);
        toast.success('🗑️ Admin deleted successfully!');
        fetchDashboardData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete admin');
      }
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Super Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className={`backdrop-blur-lg border-b ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center animate-fade-in-left">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-4 animate-pulse-slow">
                  <span className="text-2xl text-white">👑</span>
                </div>
                <div>
                  <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Super Admin Portal
                  </h1>
                  <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    Master Control Center
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 animate-fade-in-right">
                <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'}`}>
                  <span className="text-sm font-semibold">🔐 SUPER ADMIN</span>
                </div>
                <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Welcome, {user?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {[
              { title: 'Total Libraries', value: stats.totalLibraries, icon: '🏢', color: 'from-blue-500 to-cyan-500' },
              { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-green-500 to-teal-500' },
              { title: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'from-purple-500 to-pink-500' },
              { title: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: '💰', color: 'from-yellow-500 to-orange-500' }
            ].map((stat, index) => (
              <div
                key={index}
                className={`backdrop-blur-lg rounded-2xl p-6 transform transition-all duration-500 hover:scale-105 ${
                  isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stat.title}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center animate-bounce-slow`}>
                    <span className="text-2xl text-white">{stat.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Libraries Management */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${
              isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  🏢 Libraries Management
                </h2>
                <button 
                  onClick={() => setShowAddLibrary(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  + Add Library
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {libraries.map((library) => (
                  <div
                    key={library._id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                      isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {library.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          📍 {library.area}, {library.city}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          📞 {library.phone} | 📧 {library.email}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleLibraryStatus(library._id, library.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            library.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {library.isActive ? '✅ Active' : '❌ Inactive'}
                        </button>
                        <button 
                          onClick={() => handleDeleteLibrary(library._id)}
                          className="text-red-500 hover:text-red-600 transition-colors p-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Management */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${
              isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  👨‍💼 Admin Management
                </h2>
                <button 
                  onClick={() => setShowAddAdmin(true)}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  + Create Admin
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {admins.map((admin) => (
                  <div
                    key={admin._id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                      isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            {admin.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {admin.name}
                          </h3>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            📧 {admin.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          admin.role === 'superadmin'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {admin.role === 'superadmin' ? '👑 SUPER' : '🔑 ADMIN'}
                        </span>
                        {admin.role !== 'superadmin' && (
                          <button 
                            onClick={() => handleDeleteAdmin(admin._id)}
                            className="text-red-500 hover:text-red-600 transition-colors p-1"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Library Modal */}
      {showAddLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Add New Library
            </h3>
            <form onSubmit={handleAddLibrary} className="space-y-4">
              <input
                type="text"
                placeholder="Library Name"
                value={newLibrary.name}
                onChange={(e) => setNewLibrary({...newLibrary, name: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={newLibrary.address}
                onChange={(e) => setNewLibrary({...newLibrary, address: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={newLibrary.city}
                  onChange={(e) => setNewLibrary({...newLibrary, city: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <input
                  type="text"
                  placeholder="Area"
                  value={newLibrary.area}
                  onChange={(e) => setNewLibrary({...newLibrary, area: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Phone"
                  value={newLibrary.phone}
                  onChange={(e) => setNewLibrary({...newLibrary, phone: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newLibrary.email}
                  onChange={(e) => setNewLibrary({...newLibrary, email: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold"
                >
                  Add Library
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddLibrary(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Create New Admin
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <input
                type="text"
                placeholder="Admin Name"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <input
                type="email"
                placeholder="Admin Email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                required
              />
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-2 rounded-lg font-semibold"
                >
                  Create Admin
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAdmin(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fade-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-fade-in-left { animation: fade-in-left 0.8s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 0.8s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce 3s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;