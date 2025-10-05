import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!user && !token) {
      navigate('/login');
      return;
    }
    if (user || token) {
      fetchNotifications();
    }
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications');
      const realNotifications = response.data || [];
      
      console.log('Notifications received:', realNotifications.length);
      
      const formattedNotifications = realNotifications.map(notif => ({
        ...notif,
        icon: getNotificationIcon(notif.type),
        date: new Date(notif.createdAt)
      }));
      
      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setNotifications(notifications.map(notif => 
        notif._id === notificationId ? { ...notif, read: true } : notif
      ));
      
      await axios.put(`/api/notifications/${notificationId}/read`);
      toast.success('Marked as read');
    } catch (error) {
      console.error('Error marking as read:', error);
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      
      // Mark each unread notification as read
      for (const notif of unreadNotifications) {
        await axios.put(`/api/notifications/${notif._id}/read`);
      }
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      fetchNotifications(); // Refresh on error
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setNotifications(notifications.filter(notif => notif._id !== notificationId));
      await axios.delete(`/api/notifications/${notificationId}`);
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      fetchNotifications(); // Refresh on error
      toast.error('Failed to delete notification');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return notif.type === filter;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking': return '🪑';
      case 'payment': return '💳';
      case 'reminder': return '⏰';
      case 'offer': return '🎁';
      case 'event': return '📅';
      case 'system': return '⚙️';
      case 'admin': return '🔔';
      case 'security': return '🔒';
      default: return '📢';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'booking': return 'bg-green-100 text-green-800';
      case 'payment': return 'bg-blue-100 text-blue-800';
      case 'reminder': return 'bg-yellow-100 text-yellow-800';
      case 'offer': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-blue-100 text-blue-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'security': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🔔 Notifications
              </h1>
              <p className={`text-sm md:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Stay updated with your bookings and offers
              </p>
            </div>
            <button
              onClick={markAllAsRead}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold transition-all transform hover:scale-105 text-sm md:text-base"
            >
              ✅ Mark All Read
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 pb-20 md:pb-8">
        {/* Filter Tabs */}
        <div className={`mb-6 md:mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-2 md:space-x-4 lg:space-x-8 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: '📋 All', count: notifications.length },
              { id: 'unread', label: '🔴 Unread', count: notifications.filter(n => !n.read).length },
              { id: 'booking', label: '🪑 Bookings', count: notifications.filter(n => n.type === 'booking').length },
              { id: 'reminder', label: '📚 Reminders', count: notifications.filter(n => n.type === 'reminder').length },
              { id: 'offer', label: '🎁 Offers', count: notifications.filter(n => n.type === 'offer').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  console.log('Filter changed to:', tab.id);
                  setFilter(tab.id);
                }}
                className={`pb-3 md:pb-4 px-1 md:px-2 font-semibold transition-colors whitespace-nowrap text-xs md:text-sm lg:text-base ${
                  filter === tab.id
                    ? `border-b-2 border-blue-500 ${isDark ? 'text-blue-400' : 'text-blue-600'}`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 md:space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`backdrop-blur-lg rounded-xl md:rounded-2xl p-4 md:p-6 transition-all hover:shadow-lg ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              } ${!notification.read ? 'ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 md:space-x-4 flex-1">
                  <div className="text-2xl md:text-3xl">{notification.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col space-y-1 mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-sm md:text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} break-words`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(notification.type)} w-fit`}>
                        {notification.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className={`text-xs md:text-base ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2 break-words`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(notification.date).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-1 flex-shrink-0">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold transition-all whitespace-nowrap"
                    >
                      ✅ Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold transition-all whitespace-nowrap"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No notifications found
            </p>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {filter === 'all' 
                ? "You're all caught up! No new notifications." 
                : `No ${filter} notifications found`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;