import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const GlobalEvents = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Check super admin access
  if (!user || user.role !== 'superadmin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Access Denied
          </p>
          <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Only super admins can access global events management
          </p>
          <button
            onClick={() => navigate('/superadmin')}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Back to Super Admin
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Mock global events data
      const mockEvents = [
        {
          _id: '1',
          title: 'Global Reading Challenge 2024',
          description: 'Platform-wide reading challenge with prizes',
          library: { name: 'All Libraries', city: 'Global' },
          date: new Date(Date.now() + 86400000 * 7),
          registrations: 245,
          status: 'active',
          type: 'challenge',
          featured: true
        },
        {
          _id: '2',
          title: 'Digital Literacy Workshop',
          description: 'Learn essential digital skills',
          library: { name: 'Central Library', city: 'Mumbai' },
          date: new Date(Date.now() + 86400000 * 3),
          registrations: 45,
          status: 'active',
          type: 'workshop',
          featured: false
        },
        {
          _id: '3',
          title: 'Poetry Evening',
          description: 'Monthly poetry recitation event',
          library: { name: 'Arts Library', city: 'Delhi' },
          date: new Date(Date.now() + 86400000 * 5),
          registrations: 32,
          status: 'active',
          type: 'cultural',
          featured: true
        },
        {
          _id: '4',
          title: 'Study Marathon',
          description: '24-hour study session with breaks',
          library: { name: 'Study Center', city: 'Bangalore' },
          date: new Date(Date.now() - 86400000 * 2),
          registrations: 78,
          status: 'completed',
          type: 'study',
          featured: false
        }
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to cancel this event? This action cannot be undone.')) {
      try {
        setEvents(events.map(event => 
          event._id === eventId ? { ...event, status: 'cancelled' } : event
        ));
        toast.success('🚫 Event cancelled successfully');
      } catch (error) {
        toast.error('Failed to cancel event');
      }
    }
  };

  const handleFeatureEvent = async (eventId) => {
    try {
      setEvents(events.map(event => 
        event._id === eventId ? { ...event, featured: !event.featured } : event
      ));
      const event = events.find(e => e._id === eventId);
      toast.success(`⭐ Event ${event.featured ? 'unfeatured' : 'featured'} successfully`);
    } catch (error) {
      toast.error('Failed to update event');
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active') return event.status === 'active';
    if (filter === 'featured') return event.featured;
    if (filter === 'completed') return event.status === 'completed';
    return event.type === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'challenge': return '🏆';
      case 'workshop': return '🛠️';
      case 'cultural': return '🎭';
      case 'study': return '📖';
      default: return '📅';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Global Events...</p>
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
                🌍 Global Events Control Panel
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Manage events across all libraries
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate('/superadmin')}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-semibold transition-all"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => {
                  const csvData = `Event,Library,City,Date,Registrations,Status,Type\n${events.map(e => 
                    `"${e.title}","${e.library.name}","${e.library.city}","${e.date.toLocaleDateString()}",${e.registrations},"${e.status}","${e.type}"`
                  ).join('\n')}`;
                  const blob = new Blob([csvData], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'global-events-report.csv';
                  a.click();
                  toast.success('📊 Events report exported!');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-semibold transition-all"
              >
                📊 Export Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Events', value: events.length, icon: '📅', color: 'from-blue-500 to-cyan-500' },
            { title: 'Active Events', value: events.filter(e => e.status === 'active').length, icon: '✅', color: 'from-green-500 to-teal-500' },
            { title: 'Featured Events', value: events.filter(e => e.featured).length, icon: '⭐', color: 'from-yellow-500 to-orange-500' },
            { title: 'Total Registrations', value: events.reduce((sum, e) => sum + e.registrations, 0), icon: '👥', color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => (
            <div
              key={index}
              className={`backdrop-blur-lg rounded-2xl p-6 ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center`}>
                  <span className="text-xl text-white">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-4 md:space-x-8 overflow-x-auto pb-2">
            {[
              { id: 'all', label: '📅 All Events', count: events.length },
              { id: 'active', label: '✅ Active', count: events.filter(e => e.status === 'active').length },
              { id: 'featured', label: '⭐ Featured', count: events.filter(e => e.featured).length },
              { id: 'challenge', label: '🏆 Challenges', count: events.filter(e => e.type === 'challenge').length },
              { id: 'workshop', label: '🛠️ Workshops', count: events.filter(e => e.type === 'workshop').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors whitespace-nowrap text-sm md:text-base ${
                  filter === tab.id
                    ? `border-b-2 border-red-500 ${isDark ? 'text-red-400' : 'text-red-600'}`
                    : `${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div
              key={event._id}
              className={`backdrop-blur-lg rounded-2xl p-6 transition-all hover:shadow-lg ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              } ${event.featured ? 'ring-2 ring-yellow-500/30' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-4xl">{getTypeIcon(event.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {event.title}
                      </h3>
                      {event.featured && (
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          ⭐ FEATURED
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                        {event.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {event.description}
                    </p>
                    
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center">
                        <span className="mr-2">🏢</span>
                        <span>{event.library.name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">📍</span>
                        <span>{event.library.city}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        <span>{event.date.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">👥</span>
                        <span>{event.registrations} registered</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:space-x-2 md:space-y-0 space-y-2 mt-4 md:mt-0 md:ml-4">
                  {event.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleFeatureEvent(event._id)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          event.featured 
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                            : 'bg-gray-500 hover:bg-gray-600 text-white'
                        }`}
                      >
                        {event.featured ? '⭐ Unfeature' : '⭐ Feature'}
                      </button>
                      <button
                        onClick={() => handleCancelEvent(event._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        🚫 Cancel Event
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      const eventDetails = `Event Details\n\nTitle: ${event.title}\nDescription: ${event.description}\nLibrary: ${event.library.name}\nCity: ${event.library.city}\nDate: ${event.date.toLocaleDateString()}\nRegistrations: ${event.registrations}\nStatus: ${event.status}\nType: ${event.type}\nFeatured: ${event.featured ? 'Yes' : 'No'}`;
                      navigator.clipboard.writeText(eventDetails);
                      toast.success('📋 Event details copied!');
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  >
                    📋 Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <p className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              No events found
            </p>
            <p className={`mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {filter === 'all' 
                ? "No events are currently available." 
                : `No ${filter} events found`
              }
            </p>
          </div>
        )}

        {/* Popular Events Section */}
        <div className={`mt-12 backdrop-blur-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'}`}>
          <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            🔥 Most Popular Events
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {events
              .sort((a, b) => b.registrations - a.registrations)
              .slice(0, 3)
              .map((event, index) => (
                <div
                  key={event._id}
                  className={`p-4 rounded-lg ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                    index === 1 ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' :
                    'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-lg font-bold">{event.registrations}</span>
                  </div>
                  <h3 className="font-bold mb-1">{event.title}</h3>
                  <p className="text-sm opacity-90">{event.library.name}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalEvents;