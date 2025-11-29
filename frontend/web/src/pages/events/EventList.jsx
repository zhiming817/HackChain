import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function EventList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/events`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        // 将后端返回的数据格式转换为前端期望的格式
        const transformedEvents = result.data.map(event => ({
          id: event.id,
          eventId: event.event_id,
          organizer: event.organizer,
          title: event.title,
          description: event.description,
          startTime: event.start_time,
          endTime: event.end_time,
          location: event.location,
          maxParticipants: event.max_participants,
          participants: event.participant_count,
          active: event.active,
          createdAt: event.created_at,
          updatedAt: event.updated_at,
          syncedAt: event.synced_at,
        }));
        setEvents(transformedEvents);
      }
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">📋 Browse Events</h1>
            <p className="text-orange-100">Discover upcoming hackathon events</p>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600 font-medium">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-gray-600 mb-6">Be the first to create an event!</p>
                <button
                  onClick={() => navigate('/events/create')}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
                >
                  Create Event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/events/${event.eventId}`)}
                    className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border-2 border-orange-200 p-6 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-gray-600 mb-4">{event.description}</p>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>📍 {event.location}</p>
                      <p>👥 {event.participants}/{event.maxParticipants}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
