import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [stats] = useState({
    totalBookings: 45,
    todayBookings: 8,
    totalRevenue: 12500,
    totalBooks: 150
  });

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              Admin Dashboard
            </h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Welcome back, {user?.name}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
            <span className="text-sm font-semibold">🔑 ADMIN</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Bookings
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {stats.totalBookings}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-xl text-white">📅</span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Today's Bookings
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {stats.todayBookings}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                <span className="text-xl text-white">📊</span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Revenue
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  ₹{stats.totalRevenue}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xl text-white">💰</span>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Total Books
                </p>
                <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  {stats.totalBooks}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-xl text-white">📚</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📚 Manage Books
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Add, edit, or remove books from your library
            </p>
            <button 
              onClick={() => toast.success('Book management feature coming soon!')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Manage Books
            </button>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              🪑 Seat Layout
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Configure seat arrangements and pricing
            </p>
            <button 
              onClick={() => toast.success('Seat configuration feature coming soon!')}
              className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Configure Seats
            </button>
          </div>

          <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              📊 Reports
            </h3>
            <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Download booking and revenue reports
            </p>
            <button 
              onClick={() => toast.success('Reports feature coming soon!')}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;