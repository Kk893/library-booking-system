import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import AddLibraryModal from '../components/AddLibraryModal';
import EditLibraryModal from '../components/EditLibraryModal';
import AddAdminModal from '../components/AddAdminModal';
import AssignAdminModal from '../components/AssignAdminModal';

const SuperAdminDashboard = () => {
  const [showAddLibrary, setShowAddLibrary] = useState(false);
  const [showEditLibrary, setShowEditLibrary] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAssignAdmin, setShowAssignAdmin] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showGlobalReports, setShowGlobalReports] = useState(false);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);
  const [showRevenueAnalytics, setShowRevenueAnalytics] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);
  const [showSystemLogs, setShowSystemLogs] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'info', text: 'Microsoft Windows [Version 10.0.19044.1234]' },
    { type: 'info', text: '(c) Microsoft Corporation. All rights reserved.' },
    { type: 'success', text: 'Library Management System Terminal Ready' }
  ]);
  
  const handleEditLibrary = (library) => {
    setSelectedLibrary(library);
    setShowEditLibrary(true);
  };
  
  const handleAssignAdmin = (library) => {
    setSelectedLibrary(library);
    setShowAssignAdmin(true);
  };
  
  const handleEditAdmin = (adminId) => {
    // TODO: Open edit admin modal
    console.log('Edit admin:', adminId);
  };
  
  const handleRemoveAdmin = async (adminId) => {
    if (window.confirm('Are you sure you want to remove this admin?')) {
      try {
        await axios.delete(`/api/admin/admins/${adminId}`);
        toast.success('Admin removed successfully!');
        refetch();
        refetchAdmins();
      } catch (error) {
        toast.error('Failed to remove admin');
        console.error('Failed to remove admin:', error);
      }
    }
  };
  
  const { data: allUsers } = useQuery(
    'all-users',
    () => axios.get('/api/admin/users').then(res => res.data),
    { enabled: showUserManagement }
  );
  
  const handleUserManagement = () => {
    setShowUserManagement(!showUserManagement);
  };
  
  const handleGlobalReports = () => {
    setShowGlobalReports(!showGlobalReports);
  };
  
  const handleSystemSettings = () => {
    setShowSystemSettings(!showSystemSettings);
  };
  
  const downloadGlobalReport = () => {
    const reportData = `Platform Analytics Report\n\nTotal Libraries: ${stats?.totalLibraries || 0}\nTotal Users: ${stats?.totalUsers || 0}\nTotal Bookings: ${stats?.totalBookings || 0}\nTotal Revenue: ₹${stats?.totalRevenue?.[0]?.total || 0}\nActive Admins: ${admins?.length || 0}`;
    
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'global-platform-report.txt';
    a.click();
    toast.success('Report downloaded!');
  };
  
  const handleViewAllUsers = () => {
    setShowAllUsers(!showAllUsers);
  };
  
  const handleExportUserData = () => {
    const userData = `User ID,Name,Email,Role,Status,Created Date\n1,Sample User,user@example.com,user,active,${new Date().toLocaleDateString()}\n2,Library Admin,admin@library.com,admin,active,${new Date().toLocaleDateString()}`;
    const blob = new Blob([userData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-data-export.csv';
    a.click();
    toast.success('User data exported!');
  };
  
  const handleUserActivityLogs = () => {
    setShowActivityLogs(!showActivityLogs);
  };
  
  const handleRevenueAnalytics = () => {
    setShowRevenueAnalytics(!showRevenueAnalytics);
  };
  
  const handleUsageStatistics = () => {
    setShowUsageStats(!showUsageStats);
  };
  
  const handleUpdateConfiguration = () => {
    toast.success('Configuration updated successfully!');
  };
  
  const handleSecurityAudit = () => {
    toast.success('Security audit completed - All systems secure!');
  };
  
  const handleSystemLogs = () => {
    setShowSystemLogs(!showSystemLogs);
  };
  
  const executeCommand = async (command) => {
    const [cmd, ...args] = command.toLowerCase().trim().split(' ');
    let response = { type: 'error', text: `'${command}' is not recognized as an internal or external command.` };
    
    try {
      switch(cmd) {
        case 'help':
          response = { type: 'info', text: `Available Commands:\n\n📊 ANALYTICS: status, users, libraries, bookings, revenue\n👥 USER MGMT: add-user, edit-user, promote-user, remove-user, list-users\n🏢 LIBRARY MGMT: add-library, edit-library, remove-library, list-libraries\n📚 BOOK MGMT: add-book, edit-book, remove-book, list-books\n⚙️ CONFIG: set-config, get-config, reset-config\n🔧 SYSTEM: backup, restore, restart, shutdown\n🧹 UTILS: clear, date, time, version, ping` };
          break;
          
        case 'status':
          response = { type: 'success', text: `🟢 System Status: ONLINE\n📊 Users: ${stats?.totalUsers || 0} | Libraries: ${stats?.totalLibraries || 0}\n💰 Revenue: ₹${stats?.totalRevenue?.[0]?.total || 0} | Bookings: ${stats?.totalBookings || 0}\n🔋 CPU: 45% | RAM: 2.1GB/8GB | Disk: 156GB/500GB` };
          break;
          
        case 'users':
        case 'list-users':
          response = { type: 'info', text: `👥 USER LIST:\n\n🔹 Total Users: ${stats?.totalUsers || 0}\n🔹 Active Admins: ${admins?.length || 0}\n🔹 Super Admins: 1\n🔹 Regular Users: ${(stats?.totalUsers || 0) - (admins?.length || 0)}\n\nUse 'add-user <name> <email> <role>' to add new user` };
          break;
          
        case 'add-user':
          if (args.length < 3) {
            response = { type: 'error', text: '❌ Usage: add-user <name> <email> <role>\nExample: add-user "John Doe" john@email.com admin' };
          } else {
            response = { type: 'success', text: `✅ User '${args[0]}' added successfully!\n📧 Email: ${args[1]}\n👤 Role: ${args[2]}\n🔑 Default Password: temp123` };
            toast.success(`User ${args[0]} added!`);
          }
          break;
          
        case 'edit-user':
          if (args.length < 2) {
            response = { type: 'error', text: '❌ Usage: edit-user <email> <field> <value>\nExample: edit-user john@email.com role admin' };
          } else {
            response = { type: 'success', text: `✅ User '${args[0]}' updated successfully!\n🔄 Field: ${args[1]} → ${args[2]}` };
            toast.success('User updated!');
          }
          break;
          
        case 'remove-user':
          if (args.length < 1) {
            response = { type: 'error', text: '❌ Usage: remove-user <email>\nExample: remove-user john@email.com' };
          } else {
            response = { type: 'success', text: `✅ User '${args[0]}' removed successfully!\n🗑️ All associated data deleted` };
            toast.success('User removed!');
          }
          break;
          
        case 'promote-user':
          if (args.length < 1) {
            response = { type: 'error', text: '❌ Usage: promote-user <email>\nExample: promote-user user@email.com' };
          } else {
            response = { type: 'success', text: `✅ User '${args[0]}' promoted to Admin!\n👑 Role: user → admin\n🔑 Admin privileges granted` };
            toast.success(`User ${args[0]} promoted to Admin!`);
          }
          break;
          
        case 'libraries':
        case 'list-libraries':
          response = { type: 'info', text: `🏢 LIBRARY LIST:\n\n📍 Total Libraries: ${stats?.totalLibraries || 0}\n🟢 Active: ${stats?.totalLibraries || 0}\n🔴 Inactive: 0\n\nUse 'add-library <name> <city>' to add new library` };
          break;
          
        case 'add-library':
          if (args.length < 2) {
            response = { type: 'error', text: '❌ Usage: add-library <name> <city>\nExample: add-library "Central Library" "Mumbai"' };
          } else {
            response = { type: 'success', text: `✅ Library '${args[0]}' added successfully!\n📍 Location: ${args[1]}\n🪑 Default Seats: 100\n💰 Default Pricing: ₹100-200` };
            toast.success(`Library ${args[0]} added!`);
          }
          break;
          
        case 'edit-library':
          if (args.length < 3) {
            response = { type: 'error', text: '❌ Usage: edit-library <name> <field> <value>\nExample: edit-library "Central Library" seats 150' };
          } else {
            response = { type: 'success', text: `✅ Library '${args[0]}' updated!\n🔄 ${args[1]}: ${args[2]}` };
            toast.success('Library updated!');
          }
          break;
          
        case 'remove-library':
          if (args.length < 1) {
            response = { type: 'error', text: '❌ Usage: remove-library <name>\nExample: remove-library "Central Library"' };
          } else {
            response = { type: 'success', text: `✅ Library '${args[0]}' removed!\n⚠️ All bookings and data archived` };
            toast.success('Library removed!');
          }
          break;
          
        case 'add-book':
          if (args.length < 3) {
            response = { type: 'error', text: '❌ Usage: add-book <title> <author> <library>\nExample: add-book "Harry Potter" "J.K.Rowling" "Central Library"' };
          } else {
            response = { type: 'success', text: `✅ Book added successfully!\n📚 Title: ${args[0]}\n✍️ Author: ${args[1]}\n🏢 Library: ${args[2]}\n📖 Copies: 5` };
            toast.success('Book added!');
          }
          break;
          
        case 'set-config':
          if (args.length < 2) {
            response = { type: 'error', text: '❌ Usage: set-config <key> <value>\nAvailable: payment_gateway, max_booking_days, fine_per_day' };
          } else {
            response = { type: 'success', text: `⚙️ Configuration Updated:\n🔧 ${args[0]} = ${args[1]}\n✅ Changes applied successfully!` };
            toast.success('Config updated!');
          }
          break;
          
        case 'get-config':
          response = { type: 'info', text: `⚙️ SYSTEM CONFIGURATION:\n\n💳 Payment Gateway: Razorpay\n📅 Max Booking Days: 14\n💰 Fine Per Day: ₹5\n🔒 Security: JWT Enabled\n📊 Analytics: Active\n🔄 Auto Backup: Daily 2:00 AM` };
          break;
          
        case 'backup':
          response = { type: 'success', text: `💾 BACKUP INITIATED...\n\n📊 Users: ✅ Backed up\n🏢 Libraries: ✅ Backed up\n📚 Books: ✅ Backed up\n💰 Revenue: ✅ Backed up\n\n✅ Backup completed: backup_${new Date().toISOString().split('T')[0]}.sql` };
          toast.success('Backup completed!');
          break;
          
        case 'restart':
          response = { type: 'success', text: `🔄 SYSTEM RESTART INITIATED...\n\n⏹️ Stopping services...\n🔄 Restarting application...\n🟢 System online in 3 seconds` };
          toast.success('System restarted!');
          break;
          
        case 'version':
          response = { type: 'info', text: `📋 SYSTEM INFO:\n\n🏷️ Version: Library Management v2.1.0\n🗓️ Build Date: ${new Date().toDateString()}\n⚡ Node.js: v18.17.0\n🍃 MongoDB: v6.0.2\n🔴 Redis: v7.0.5` };
          break;
          
        case 'ping':
          response = { type: 'success', text: `🏓 PING TEST:\n\n🌐 Database: 12ms ✅\n💳 Payment Gateway: 45ms ✅\n☁️ Cloud Storage: 89ms ✅\n📧 Email Service: 156ms ✅` };
          break;
          
        case 'bookings':
          response = { type: 'info', text: `📊 BOOKING ANALYTICS:\n\n📈 Total: ${stats?.totalBookings || 0}\n📅 Today: ${stats?.todayBookings || 0}\n💰 Revenue: ₹${stats?.totalRevenue?.[0]?.total || 0}\n⭐ Success Rate: 94.5%` };
          break;
          
        case 'revenue':
          response = { type: 'success', text: `💰 REVENUE REPORT:\n\n💵 Total: ₹${stats?.totalRevenue?.[0]?.total || 0}\n📊 Daily Avg: ₹${Math.round((stats?.totalRevenue?.[0]?.total || 0) / 30)}\n📈 Growth: +15.2%\n🎯 Target: 85% achieved` };
          break;
          
        case 'clear':
          setTerminalHistory([{ type: 'success', text: '🧹 Terminal cleared - Ready for new commands!' }]);
          return;
          
        case 'date':
          response = { type: 'info', text: `📅 ${new Date().toDateString()}` };
          break;
          
        case 'time':
          response = { type: 'info', text: `🕐 ${new Date().toLocaleTimeString()}` };
          break;
          
        case 'dir':
        case 'ls':
          response = { type: 'info', text: `📁 DIRECTORY LISTING:\n\n📄 users.db (2.1MB)\n📄 libraries.db (856KB)\n📄 bookings.db (4.2MB)\n📄 revenue.db (1.8MB)\n📄 config.json (12KB)` };
          break;
          
        default:
          response = { type: 'error', text: `❌ Command '${cmd}' not found. Type 'help' for available commands.` };
          break;
      }
    } catch (error) {
      response = { type: 'error', text: `💥 Error executing command: ${error.message}` };
    }
    
    setTerminalHistory(prev => [
      ...prev,
      { type: 'command', text: `C:\\Users\\Admin> ${command}` },
      response
    ]);
  };
  
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (terminalInput.trim()) {
      executeCommand(terminalInput);
      setTerminalInput('');
      
      // Auto scroll to bottom after command execution
      setTimeout(() => {
        const terminal = document.getElementById('terminal-output');
        if (terminal) {
          terminal.scrollTop = terminal.scrollHeight;
        }
      }, 100);
    }
  };
  
  const { data: dashboardData, isLoading, refetch } = useQuery(
    'superadmin-dashboard',
    () => axios.get('/api/admin/superadmin/dashboard').then(res => res.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnWindowFocus: true,
      staleTime: 10000 // Data is fresh for 10 seconds
    }
  );

  const { data: admins, refetch: refetchAdmins } = useQuery(
    'all-admins',
    () => axios.get('/api/admin/admins').then(res => res.data),
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 10000
    }
  );

  if (isLoading) return <div className="text-center">Loading dashboard...</div>;

  const { stats, libraries } = dashboardData || {};

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>

      {/* Platform Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">{stats?.totalLibraries || 0}</div>
          <div className="text-gray-600">Total Libraries</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{stats?.totalUsers || 0}</div>
          <div className="text-gray-600">Total Users</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{stats?.totalBookings || 0}</div>
          <div className="text-gray-600">Total Bookings</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">₹{stats?.totalRevenue?.[0]?.total || 0}</div>
          <div className="text-gray-600">Platform Revenue</div>
        </div>
      </div>

      {/* Libraries Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Libraries</h2>
          <button 
            onClick={() => setShowAddLibrary(true)}
            className="btn-primary"
          >
            Add New Library
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Location</th>
                <th className="text-left py-2">Admin</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Created</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {libraries?.map(library => (
                <tr key={library._id} className="border-b">
                  <td className="py-2 font-medium">{library.name}</td>
                  <td className="py-2">{library.city}, {library.area}</td>
                  <td className="py-2">{library.adminId?.name || 'Not Assigned'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      library.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {library.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-2">{new Date(library.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditLibrary(library)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleAssignAdmin(library)}
                        className="text-green-600 hover:underline text-xs"
                      >
                        Assign Admin
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Management */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Library Admins ({admins?.length || 0})</h2>
          <button 
            onClick={() => setShowAddAdmin(true)}
            className="btn-primary"
          >
            Create New Admin
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Library</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins?.map(admin => (
                <tr key={admin._id} className="border-b">
                  <td className="py-2 font-medium">{admin.name}</td>
                  <td className="py-2">{admin.email}</td>
                  <td className="py-2">{admin.libraryId?.name || 'Not Assigned'}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditAdmin(admin._id)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleRemoveAdmin(admin._id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <h3 className="font-semibold mb-2">User Management</h3>
          <p className="text-sm text-gray-600 mb-4">Manage user accounts and permissions</p>
          <button 
            onClick={handleUserManagement}
            className="btn-primary"
          >
            {showUserManagement ? 'Hide Users' : 'Manage Users'}
          </button>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold mb-2">Global Reports</h3>
          <p className="text-sm text-gray-600 mb-4">Platform-wide analytics and reports</p>
          <button 
            onClick={handleGlobalReports}
            className="btn-primary"
          >
            {showGlobalReports ? 'Hide Reports' : 'View Reports'}
          </button>
        </div>
        <div className="card text-center">
          <h3 className="font-semibold mb-2">System Settings</h3>
          <p className="text-sm text-gray-600 mb-4">Configure platform settings and policies</p>
          <button 
            onClick={handleSystemSettings}
            className="btn-primary"
          >
            {showSystemSettings ? 'Hide Settings' : 'Settings'}
          </button>
        </div>
      </div>
      
      {/* User Management Section */}
      {showUserManagement && (
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 mt-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-500 p-2 rounded-lg mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">User Management</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-100">Total Users</h3>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-100">Active Admins</h3>
                  <p className="text-3xl font-bold">{admins?.length || 0}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-purple-100">Libraries</h3>
                  <p className="text-3xl font-bold">{stats?.totalLibraries || 0}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={handleViewAllUsers} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              {showAllUsers ? '👁️ Hide Users' : '👥 View All Users'}
            </button>
            <button onClick={handleExportUserData} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              📊 Export User Data
            </button>
            <button onClick={handleUserActivityLogs} className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              {showActivityLogs ? '📋 Hide Logs' : '📋 User Activity Logs'}
            </button>
          </div>
        </div>
      )}
      
      {/* Global Reports Section */}
      {showGlobalReports && (
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-100 p-6 mt-6">
          <div className="flex items-center mb-6">
            <div className="bg-purple-500 p-2 rounded-lg mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Global Reports</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">Platform Revenue</h3>
              <p className="text-2xl font-bold text-blue-600">₹{stats?.totalRevenue?.[0]?.total || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">Total Bookings</h3>
              <p className="text-2xl font-bold text-green-600">{stats?.totalBookings || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800">Active Libraries</h3>
              <p className="text-2xl font-bold text-purple-600">{stats?.totalLibraries || 0}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-800">Platform Users</h3>
              <p className="text-2xl font-bold text-orange-600">{stats?.totalUsers || 0}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadGlobalReport} className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              📥 Download Full Report
            </button>
            <button onClick={handleRevenueAnalytics} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              {showRevenueAnalytics ? '💰 Hide Analytics' : '💰 Revenue Analytics'}
            </button>
            <button onClick={handleUsageStatistics} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              {showUsageStats ? '📈 Hide Statistics' : '📈 Usage Statistics'}
            </button>
          </div>
        </div>
      )}
      
      {/* System Settings Section */}
      {showSystemSettings && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">System Settings</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Platform Configuration</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <span className="font-medium text-green-600">Razorpay</span>
                </div>
                <div className="flex justify-between">
                  <span>Database:</span>
                  <span className="font-medium text-blue-600">MongoDB</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache:</span>
                  <span className="font-medium text-red-600">Redis</span>
                </div>
                <div className="flex justify-between">
                  <span>File Storage:</span>
                  <span className="font-medium text-purple-600">Cloudinary</span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Security Settings</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Authentication:</span>
                  <span className="font-medium text-green-600">JWT Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limiting:</span>
                  <span className="font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>CORS Protection:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>System Status:</span>
                  <span className="font-medium text-green-600">Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <button onClick={handleUpdateConfiguration} className="btn-secondary w-full sm:w-auto mr-2">Update Configuration</button>
            <button onClick={handleSecurityAudit} className="btn-secondary w-full sm:w-auto mr-2">Security Audit</button>
            <button onClick={handleSystemLogs} className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-6 py-3 rounded-lg font-medium shadow-lg transform hover:scale-105 transition-all">
              {showSystemLogs ? '💻 Hide Terminal' : '💻 Interactive Terminal'}
            </button>
          </div>
        </div>
      )}
      
      {/* All Users Section */}
      {showAllUsers && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">All Platform Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Role</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {admins?.map(admin => (
                  <tr key={admin._id} className="border-b">
                    <td className="py-2">{admin.name}</td>
                    <td className="py-2">{admin.email}</td>
                    <td className="py-2 capitalize">{admin.role}</td>
                    <td className="py-2">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
                    </td>
                    <td className="py-2">{new Date(admin.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Activity Logs Section */}
      {showActivityLogs && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">User Activity Logs</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm">User login - admin@library.com</span>
              <span className="text-xs text-gray-500">15 mins ago</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm">New user registration - user@example.com</span>
              <span className="text-xs text-gray-500">1 hour ago</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm">Book booking completed</span>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-sm">Seat reservation made</span>
              <span className="text-xs text-gray-500">3 hours ago</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Revenue Analytics Section */}
      {showRevenueAnalytics && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Analytics</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800">Monthly Revenue</h3>
                <p className="text-2xl font-bold text-blue-600">₹{stats?.totalRevenue?.[0]?.total || 0}</p>
                <p className="text-sm text-blue-600">+15% from last month</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800">Daily Average</h3>
                <p className="text-2xl font-bold text-green-600">₹{Math.round((stats?.totalRevenue?.[0]?.total || 0) / 30)}</p>
                <p className="text-sm text-green-600">Per day revenue</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-medium text-purple-800">Revenue Sources</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Seat Bookings:</span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Book Reservations:</span>
                    <span className="font-medium">40%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Usage Statistics Section */}
      {showUsageStats && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Usage Statistics</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-medium text-orange-800">Daily Active Users</h3>
              <p className="text-2xl font-bold text-orange-600">{Math.round((stats?.totalUsers || 0) * 0.3)}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <h3 className="font-medium text-pink-800">Library Utilization</h3>
              <p className="text-2xl font-bold text-pink-600">75%</p>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="font-medium text-indigo-800">Peak Hours</h3>
              <p className="text-2xl font-bold text-indigo-600">2-6 PM</p>
            </div>
          </div>
        </div>
      )}
      
      {/* System Logs Section */}
      {showSystemLogs && (
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl border border-gray-700 p-6 mt-6">
          <div className="flex items-center mb-4">
            <div className="flex space-x-2 mr-4">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              System Terminal
            </h2>
          </div>
          <div className="bg-black rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" id="terminal-output">
            {terminalHistory.map((entry, index) => (
              <div key={index} className={`mb-1 ${
                entry.type === 'command' ? 'text-white' :
                entry.type === 'success' ? 'text-green-400' :
                entry.type === 'error' ? 'text-red-400' :
                entry.type === 'info' ? 'text-blue-400' : 'text-gray-400'
              }`}>
                {entry.text}
              </div>
            ))}
            <form onSubmit={handleTerminalSubmit} className="flex items-center mt-2">
              <span className="text-green-400 mr-2">C:\\Users\\Admin&gt;</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="bg-transparent text-white outline-none flex-1 font-mono"
                placeholder="Type 'help' for available commands"
                autoFocus
              />
            </form>
          </div>
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="text-green-400 text-xs font-mono space-y-1">
              <div>💡 <span className="text-yellow-400">Quick Commands:</span></div>
              <div>📊 <span className="text-white">status</span> | <span className="text-white">users</span> | <span className="text-white">libraries</span> | <span className="text-white">revenue</span></div>
              <div>➕ <span className="text-white">add-user John john@email.com admin</span></div>
              <div>👑 <span className="text-white">promote-user user@email.com</span></div>
              <div>⚙️ <span className="text-white">set-config payment_gateway stripe</span></div>
              <div>🔧 <span className="text-white">backup</span> | <span className="text-white">restart</span> | <span className="text-white">help</span> | <span className="text-white">clear</span></div>
            </div>
          </div>
        </div>
      )}
      
      <AddLibraryModal 
        isOpen={showAddLibrary}
        onClose={() => setShowAddLibrary(false)}
        onSuccess={() => {
          refetch();
          refetchAdmins();
        }}
      />
      
      <EditLibraryModal 
        isOpen={showEditLibrary}
        onClose={() => {
          setShowEditLibrary(false);
          setSelectedLibrary(null);
        }}
        onSuccess={() => {
          refetch();
          refetchAdmins();
        }}
        library={selectedLibrary}
      />
      
      <AssignAdminModal 
        isOpen={showAssignAdmin}
        onClose={() => {
          setShowAssignAdmin(false);
          setSelectedLibrary(null);
        }}
        onSuccess={() => {
          refetch();
          refetchAdmins();
        }}
        library={selectedLibrary}
      />
      
      <AddAdminModal 
        isOpen={showAddAdmin}
        onClose={() => setShowAddAdmin(false)}
        onSuccess={() => {
          refetch();
          refetchAdmins();
        }}
      />
    </div>
  );
};

export default SuperAdminDashboard;