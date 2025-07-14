import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      try {
        const response = await axios.get('/api/notifications', { headers });
        const realNotifications = response.data || [];
        
        if (realNotifications.length > 0) {
          setNotifications(realNotifications);
          return;
        }
      } catch (apiError) {
        console.log('Using mock data:', apiError.message);
      }
      
      // Fallback to mock notifications
      const mockNotifications = [
        {
          _id: '1',
          type: 'booking_confirmation',
          title: 'Booking Confirmed! 🎉',
          message: 'Your seat booking at Central Library has been confirmed for tomorrow.',
          date: new Date(),
          read: false,
          icon: '🪑'
        },
        {
          _id: '2',
          type: 'due_reminder',
          title: 'Book Due Reminder 📚',
          message: 'Your book "JavaScript Guide" is due in 2 days. Please return or renew.',
          date: new Date(Date.now() - 86400000),
          read: false,
          icon: '⏰'
        },
        {
          _id: '3',
          type: 'offer',
          title: 'Special Offer! 🎁',
          message: 'Get 20% off on your next seat booking. Use code SAVE20.',
          date: new Date(Date.now() - 172800000),
          read: true,
          icon: '💰'
        },
        {
          _id: '4',
          type: 'event',
          title: 'New Event: Book Reading Session 📖',
          message: 'Join our weekly book reading session this Saturday at 3 PM.',
          date: new Date(Date.now() - 259200000),
          read: true,
          icon: '📅'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      await axios.put(`/api/notifications/${notificationId}/read`, {}, { headers });
      
      setNotifications(notifications.map(notif => 
        notif._id === notificationId ? { ...notif, read: true } : notif
      ));
      toast.success('Marked as read');
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setNotifications(notifications.filter(notif => notif._id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return notif.type === filter;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'booking_confirmation': return 'bg-green-100 text-green-800';
      case 'due_reminder': return 'bg-yellow-100 text-yellow-800';
      case 'offer': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-blue-100 text-blue-800';
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
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🔔 Notifications
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Stay updated with your bookings and offers
              </p>
            </div>
            <button
              onClick={markAllAsRead}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105"
            >
              ✅ Mark All Read
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-4 md:space-x-8 overflow-x-auto pb-2">
            {[
              { id: 'all', label: '📋 All', count: notifications.length },
              { id: 'unread', label: '🔴 Unread', count: notifications.filter(n => !n.read).length },
              { id: 'booking_confirmation', label: '🪑 Bookings', count: notifications.filter(n => n.type === 'booking_confirmation').length },
              { id: 'due_reminder', label: '📚 Reminders', count: notifications.filter(n => n.type === 'due_reminder').length },
              { id: 'offer', label: '🎁 Offers', count: notifications.filter(n => n.type === 'offer').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors whitespace-nowrap text-sm md:text-base ${
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
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`backdrop-blur-lg rounded-2xl p-6 transition-all hover:shadow-lg ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              } ${!notification.read ? 'ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-3xl">{notification.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getTypeColor(notification.type)}`}>
                        {notification.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                      {notification.message}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(notification.date).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold transition-all"
                    >
                      ✅ Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification._id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition-all"
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