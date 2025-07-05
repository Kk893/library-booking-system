import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [stats] = useState({
    totalLibraries: 12,
    totalUsers: 450,
    totalBookings: 1250,
    totalRevenue: 85000
  });
  const [libraries] = useState([
    { _id: '1', name: 'Central Library', area: 'Downtown', city: 'Mumbai', isActive: true },
    { _id: '2', name: 'Tech Library', area: 'Bandra', city: 'Mumbai', isActive: true },
    { _id: '3', name: 'Study Hub', area: 'Andheri', city: 'Mumbai', isActive: false }
  ]);
  const [admins] = useState([
    { _id: '1', name: 'John Admin', email: 'john@admin.com', role: 'admin' },
    { _id: '2', name: 'Super User', email: 'super@admin.com', role: 'superadmin' }
  ]);

  React.useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

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
              { title: 'Total Libraries', value: stats.totalLibraries, icon: '🏢', color: 'from-blue-500 to-cyan-500', delay: '0' },
              { title: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'from-green-500 to-teal-500', delay: '100' },
              { title: 'Total Bookings', value: stats.totalBookings, icon: '📅', color: 'from-purple-500 to-pink-500', delay: '200' },
              { title: 'Total Revenue', value: `₹${stats.totalRevenue}`, icon: '💰', color: 'from-yellow-500 to-orange-500', delay: '300' }
            ].map((stat, index) => (
              <div
                key={index}
                className={`backdrop-blur-lg rounded-2xl p-6 transform transition-all duration-500 hover:scale-105 animate-fade-in-up ${
                  isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
                }`}
                style={{ animationDelay: `${stat.delay}ms` }}
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
            <div className={`backdrop-blur-lg rounded-2xl p-6 animate-fade-in-left ${
              isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  🏢 Libraries Management
                </h2>
                <button 
                  onClick={() => toast.success('Add library feature coming soon!')}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  + Add Library
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {libraries.map((library, index) => (
                  <div
                    key={library._id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                      isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {library.name}
                        </h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          📍 {library.area}, {library.city}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          library.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {library.isActive ? '✅ Active' : '❌ Inactive'}
                        </span>
                        <button 
                          onClick={() => toast.success('Edit library feature coming soon!')}
                          className="text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Management */}
            <div className={`backdrop-blur-lg rounded-2xl p-6 animate-fade-in-right ${
              isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  👨‍💼 Admin Management
                </h2>
                <button 
                  onClick={() => toast.success('Create admin feature coming soon!')}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-full font-semibold transition-all transform hover:scale-105"
                >
                  + Create Admin
                </button>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {admins.map((admin, index) => (
                  <div
                    key={admin._id}
                    className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                      isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
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
                        <button 
                          onClick={() => toast.success('Delete admin feature coming soon!')}
                          className="text-red-500 hover:text-red-600 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Analytics */}
          <div className={`mt-8 backdrop-blur-lg rounded-2xl p-6 animate-fade-in-up ${
            isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📊 System Analytics
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                  <span className="text-3xl text-white">📈</span>
                </div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Growth Rate
                </h3>
                <p className="text-green-500 font-semibold text-2xl">+25%</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                  <span className="text-3xl text-white">⚡</span>
                </div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  System Health
                </h3>
                <p className="text-blue-500 font-semibold text-2xl">99.9%</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-slow">
                  <span className="text-3xl text-white">🎯</span>
                </div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  User Satisfaction
                </h3>
                <p className="text-purple-500 font-semibold text-2xl">4.8/5</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-fade-in-left { animation: fade-in-left 0.8s ease-out; }
        .animate-fade-in-right { animation: fade-in-right 0.8s ease-out; }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;