import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import axios from '../utils/axios';

const NotificationDropdown = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user && localStorage.getItem('token')) {
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const response = await axios.get('/api/notifications/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log('Failed to fetch unread count:', error.message);
      }
      setUnreadCount(0);
    }
  };

  const fetchRecentNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      setNotifications([]);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications?limit=5');
      const notifications = response.data || [];
      
      const formattedNotifications = notifications.map(notif => ({
        ...notif,
        icon: getNotificationIcon(notif.type),
        date: new Date(notif.createdAt)
      }));
      
      setNotifications(formattedNotifications);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log('Failed to fetch notifications:', error.message);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification.title);
    
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    // Navigate to notifications page
    setIsOpen(false);
    navigate('/notifications');
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(notifications.map(notif => 
        notif._id === notificationId ? { ...notif, read: true } : notif
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('Failed to mark as read:', error.message);
    }
  };

  const toggleDropdown = () => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      return;
    }
    
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchRecentNotifications();
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={toggleDropdown}
        className={`relative p-2 rounded-full transition-colors ${
          isDark 
            ? 'text-gray-300 hover:text-white hover:bg-gray-800' 
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 19H6.414a1 1 0 01-.707-.293L4 17V6a3 3 0 013-3h10a3 3 0 013 3v5" />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-72 md:w-80 rounded-lg shadow-lg border z-50 ${
          isDark 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                🔔 Notifications
              </h3>
              <button
                onClick={() => navigate('/notifications')}
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 md:max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Loading...
                </p>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-3 md:px-4 py-2 md:py-3 border-b cursor-pointer transition-colors ${
                    isDark 
                      ? 'border-gray-700 hover:bg-gray-700' 
                      : 'border-gray-100 hover:bg-gray-50'
                  } ${!notification.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start space-x-2 md:space-x-3">
                    <div className="text-base md:text-lg">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className={`font-medium text-xs md:text-sm truncate ${
                          isDark ? 'text-white' : 'text-gray-800'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs mt-1 ${
                        isDark ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {new Date(notification.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  No notifications
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  You're all caught up!
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className={`px-4 py-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full text-center text-blue-500 hover:text-blue-600 text-sm font-medium py-1"
              >
                View All Notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;