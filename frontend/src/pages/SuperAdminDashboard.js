import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddLibraryModal from '../components/AddLibraryModal';
import EditLibraryModal from '../components/EditLibraryModal';
import Terminal from '../components/Terminal';

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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showEditLibrary, setShowEditLibrary] = useState(false);
  const [showEditAdmin, setShowEditAdmin] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);
  const [assigningLibrary, setAssigningLibrary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
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
      const [statsRes, librariesRes, adminsRes, usersRes] = await Promise.all([
        axios.get('/api/superadmin/stats'),
        axios.get('/api/superadmin/libraries'),
        axios.get('/api/superadmin/admins'),
        axios.get('/api/superadmin/users')
      ]);
      
      setStats(statsRes.data);
      setLibraries(librariesRes.data);
      setAdmins(adminsRes.data);
      setUsers(usersRes.data);
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

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/superadmin/users/${id}`);
        toast.success('🗑️ User deleted successfully!');
        fetchDashboardData();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  const handleSuspendUser = async (id, currentStatus) => {
    try {
      await axios.put(`/api/superadmin/users/${id}`, { isActive: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'suspended'} successfully!`);
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleEditLibrary = (library) => {
    setEditingLibrary(library);
    setShowEditLibrary(true);
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
      {/* Header */}
      <div className={`backdrop-blur-lg border-b ${isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowTerminal(true)}
                className={`p-3 rounded-full transition-all duration-300 hover:scale-110 ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-green-400' 
                    : 'bg-gray-200 hover:bg-gray-300 text-green-600'
                }`}
                title="Open Terminal"
              >
                <span className="text-lg">💻</span>
              </button>
              <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800'}`}>
                <span className="text-sm font-semibold">🔐 SUPER ADMIN</span>
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
                <div className={`w-16 h-16 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center`}>
                  <span className="text-2xl text-white">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'libraries', label: '🏢 Libraries' },
              { id: 'admins', label: '👨‍💼 Admins' },
              { id: 'users', label: '👥 Users' },
              { id: 'analytics', label: '📈 Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? `border-b-2 border-red-500 ${isDark ? 'text-red-400' : 'text-red-600'}`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📊 Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Active Libraries</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{libraries.filter(l => l.isActive !== false).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Active Users</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{users.filter(u => u.isActive !== false).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Total Admins</span>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{admins.length}</span>
                </div>
              </div>
            </div>
            
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>🎯 Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={() => setShowAddLibrary(true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm">
                  + Add Library
                </button>
                <button onClick={() => setShowAddAdmin(true)} className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm">
                  + Create Admin
                </button>
                <button onClick={() => setActiveTab('users')} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm">
                  Manage Users
                </button>
              </div>
            </div>
            
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>⚡ System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Server Status</span>
                  <span className="text-green-500 font-bold">🟢 Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Database</span>
                  <span className="text-green-500 font-bold">🟢 Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>API Health</span>
                  <span className="text-green-500 font-bold">🟢 Healthy</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'libraries' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
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
            <div className="space-y-4">
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
                          library.isActive !== false
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {library.isActive !== false ? '✅ Active' : '❌ Inactive'}
                      </button>
                      <button 
                        onClick={() => handleEditLibrary(library)}
                        className="text-blue-500 hover:text-blue-600 transition-colors p-1 mr-2"
                        title="Edit Library"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => {
                          setAssigningLibrary(library);
                          setShowAssignAdmin(true);
                        }}
                        className="text-green-500 hover:text-green-600 transition-colors p-1 mr-2"
                        title="Assign Admin"
                      >
                        👨‍💼
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
        )}

        {activeTab === 'admins' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
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
            <div className="space-y-4">
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
                        <>
                          <button 
                            onClick={() => {
                              setEditingAdmin(admin);
                              setAssigningLibrary(null);
                              setShowAssignAdmin(true);
                            }}
                            className="text-green-500 hover:text-green-600 transition-colors p-1 mr-2"
                            title="Assign Library"
                          >
                            🏢
                          </button>
                          <button 
                            onClick={() => handleDeleteAdmin(admin._id)}
                            className="text-red-500 hover:text-red-600 transition-colors p-1"
                            title="Delete Admin"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                👥 User Management
              </h2>
              <div className="text-sm text-gray-500">
                Total: {users.length} users
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>User</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Joined</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                    <th className={`text-left py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-bold text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {user.email}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.isActive !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive !== false ? '✅ Active' : '❌ Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSuspendUser(user._id, user.isActive !== false)}
                            className={`px-3 py-1 rounded text-xs font-semibold ${
                              user.isActive !== false
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {user.isActive !== false ? '⏸️ Suspend' : '▶️ Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>📈 Growth Analytics</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <div className="text-sm opacity-90">Total Users</div>
                  <div className="text-xs opacity-75">+12% this month</div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-teal-600 p-4 rounded-lg text-white">
                  <div className="text-2xl font-bold">{stats.totalBookings}</div>
                  <div className="text-sm opacity-90">Total Bookings</div>
                  <div className="text-xs opacity-75">+8% this month</div>
                </div>
              </div>
            </div>
            
            <div className={`backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
              <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>💰 Revenue Analytics</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-4 rounded-lg text-white">
                  <div className="text-2xl font-bold">₹{stats.totalRevenue}</div>
                  <div className="text-sm opacity-90">Total Revenue</div>
                  <div className="text-xs opacity-75">+15% this month</div>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4 rounded-lg text-white">
                  <div className="text-2xl font-bold">₹{Math.round(stats.totalRevenue / (stats.totalBookings || 1))}</div>
                  <div className="text-sm opacity-90">Avg per Booking</div>
                  <div className="text-xs opacity-75">+5% this month</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddLibraryModal 
        isOpen={showAddLibrary}
        onClose={() => setShowAddLibrary(false)}
        onSuccess={fetchDashboardData}
      />

      <EditLibraryModal 
        isOpen={showEditLibrary}
        onClose={() => {
          setShowEditLibrary(false);
          setEditingLibrary(null);
        }}
        onSuccess={fetchDashboardData}
        library={editingLibrary}
      />

      {/* Assign Admin/Library Modal */}
      {showAssignAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {assigningLibrary ? `Assign Admin to ${assigningLibrary.name}` : `Assign Library to ${editingAdmin?.name}`}
            </h3>
            <input
              type="text"
              placeholder={assigningLibrary ? "Search admins..." : "Search libraries..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-2 mb-4 rounded-lg border ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
              }`}
            />
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {assigningLibrary ? (
                // Show admins when assigning to library
                admins.filter(admin => 
                  admin.role === 'admin' && 
                  (admin.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   admin.email.toLowerCase().includes(searchTerm.toLowerCase()))
                ).map((admin) => (
                  <div
                    key={admin._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={async () => {
                      try {
                        await axios.put(`/api/superadmin/libraries/${assigningLibrary._id}`, { adminId: admin._id });
                        toast.success('👨‍💼 Admin assigned to library successfully!');
                        setShowAssignAdmin(false);
                        setAssigningLibrary(null);
                        fetchDashboardData();
                      } catch (error) {
                        toast.error('Failed to assign admin');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xs">
                          {admin.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {admin.name}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {admin.email}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                // Show libraries when assigning to admin
                libraries.filter(library => 
                  library.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  library.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  library.city.toLowerCase().includes(searchTerm.toLowerCase())
                ).map((library) => (
                  <div
                    key={library._id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={async () => {
                      try {
                        await axios.put(`/api/superadmin/libraries/${library._id}`, { adminId: editingAdmin._id });
                        toast.success('🏢 Library assigned to admin successfully!');
                        setShowAssignAdmin(false);
                        setEditingAdmin(null);
                        fetchDashboardData();
                      } catch (error) {
                        toast.error('Failed to assign library');
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-white font-bold text-xs">
                          🏢
                        </span>
                      </div>
                      <div>
                        <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {library.name}
                        </h4>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {library.area}, {library.city}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex space-x-4 pt-4">
              <button
                onClick={() => {
                  setShowAssignAdmin(false);
                  setAssigningLibrary(null);
                  setEditingAdmin(null);
                  setSearchTerm('');
                }}
                className="w-full bg-gray-500 text-white py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
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

      <Terminal 
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;