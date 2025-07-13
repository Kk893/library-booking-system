import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Events = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [registeredEvents, setRegisteredEvents] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Mock events data
      const mockEvents = [
        {
          _id: '1',
          title: 'Book Reading Session: "The Great Gatsby"',
          description: 'Join us for an interactive book reading and discussion session.',
          date: new Date(Date.now() + 86400000 * 2), // 2 days from now
          time: '15:00',
          duration: '2 hours',
          library: { name: 'Central Library', area: 'Downtown', city: 'Mumbai' },
          type: 'reading',
          price: 0,
          maxParticipants: 20,
          registeredCount: 8,
          image: '/api/placeholder/400/200',
          tags: ['Literature', 'Discussion', 'Free']
        },
        {
          _id: '2',
          title: 'Digital Skills Workshop',
          description: 'Learn essential digital skills including online research and digital literacy.',
          date: new Date(Date.now() + 86400000 * 5), // 5 days from now
          time: '10:00',
          duration: '3 hours',
          library: { name: 'Tech Library', area: 'Bandra', city: 'Mumbai' },
          type: 'workshop',
          price: 299,
          maxParticipants: 15,
          registeredCount: 12,
          image: '/api/placeholder/400/200',
          tags: ['Technology', 'Skills', 'Paid']
        },
        {
          _id: '3',
          title: 'Poetry Evening',
          description: 'An evening of poetry recitation and creative writing.',
          date: new Date(Date.now() + 86400000 * 7), // 1 week from now
          time: '18:00',
          duration: '2.5 hours',
          library: { name: 'Arts Library', area: 'Juhu', city: 'Mumbai' },
          type: 'cultural',
          price: 150,
          maxParticipants: 25,
          registeredCount: 5,
          image: '/api/placeholder/400/200',
          tags: ['Poetry', 'Arts', 'Evening']
        },
        {
          _id: '4',
          title: 'Study Group: Competitive Exams',
          description: 'Group study session for competitive exam preparation.',
          date: new Date(Date.now() + 86400000 * 3), // 3 days from now
          time: '09:00',
          duration: '4 hours',
          library: { name: 'Study Center', area: 'Andheri', city: 'Mumbai' },
          type: 'study',
          price: 0,
          maxParticipants: 30,
          registeredCount: 18,
          image: '/api/placeholder/400/200',
          tags: ['Study', 'Exams', 'Group']
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

  const registerForEvent = async (eventId) => {
    if (!user) {
      toast.error('Please login to register for events');
      navigate('/login');
      return;
    }

    try {
      setRegisteredEvents([...registeredEvents, eventId]);
      toast.success('🎉 Successfully registered for the event!');
    } catch (error) {
      toast.error('Failed to register for event');
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'free') return event.price === 0;
    if (filter === 'paid') return event.price > 0;
    if (filter === 'upcoming') return new Date(event.date) > new Date();
    return event.type === filter;
  });

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'reading': return 'bg-blue-100 text-blue-800';
      case 'workshop': return 'bg-green-100 text-green-800';
      case 'cultural': return 'bg-purple-100 text-purple-800';
      case 'study': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'reading': return '📚';
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className={`text-xl ${isDark ? 'text-white' : 'text-gray-800'}`}>Loading Events...</p>
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
                🎭 Library Events
              </h1>
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Discover and join exciting library events
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className={`mb-8 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'all', label: '📅 All Events', count: events.length },
              { id: 'upcoming', label: '⏰ Upcoming', count: events.filter(e => new Date(e.date) > new Date()).length },
              { id: 'free', label: '🆓 Free', count: events.filter(e => e.price === 0).length },
              { id: 'reading', label: '📚 Reading', count: events.filter(e => e.type === 'reading').length },
              { id: 'workshop', label: '🛠️ Workshops', count: events.filter(e => e.type === 'workshop').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`pb-4 px-2 font-semibold transition-colors whitespace-nowrap ${
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

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div
              key={event._id}
              className={`backdrop-blur-lg rounded-2xl overflow-hidden transition-all hover:shadow-lg transform hover:scale-105 ${
                isDark ? 'bg-gray-800/80 border border-gray-700' : 'bg-white/80 border border-white/20'
              }`}
            >
              {/* Event Image */}
              <div className="h-48 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-6xl text-white">{getEventIcon(event.type)}</span>
              </div>

              <div className="p-6">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {event.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getEventTypeColor(event.type)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                      {event.price === 0 ? 'FREE' : `₹${event.price}`}
                    </p>
                  </div>
                </div>

                {/* Event Details */}
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {event.description}
                </p>

                <div className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <div className="flex items-center">
                    <span className="mr-2">📍</span>
                    <span>{event.library.name}, {event.library.area}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">📅</span>
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">🕒</span>
                    <span>{event.time} ({event.duration})</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">👥</span>
                    <span>{event.registeredCount}/{event.maxParticipants} registered</span>
                  </div>
                </div>

                {/* Registration Progress */}
                <div className="mt-4">
                  <div className={`w-full bg-gray-200 rounded-full h-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(event.registeredCount / event.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Register Button */}
                <div className="mt-6">
                  {registeredEvents.includes(event._id) ? (
                    <button
                      disabled
                      className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold"
                    >
                      ✅ Registered
                    </button>
                  ) : event.registeredCount >= event.maxParticipants ? (
                    <button
                      disabled
                      className="w-full bg-gray-400 text-white py-3 rounded-lg font-semibold"
                    >
                      🚫 Event Full
                    </button>
                  ) : (
                    <button
                      onClick={() => registerForEvent(event._id)}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
                    >
                      🎟️ Register Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
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
      </div>
    </div>
  );
};

export default Events;