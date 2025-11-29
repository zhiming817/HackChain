import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import Navbar from '../../layout/Navbar.jsx';
import Footer from '../../layout/Footer.jsx';

export default function TicketManagement() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTicket();
  }, [ticketId, isConnected]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      // TODO: Fetch ticket from contract
      setTicket(null);
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading ticket...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
          <button
            onClick={() => navigate('/events/tickets')}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold"
          >
            Back to Tickets
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/events/tickets')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-orange-600 font-medium transition-colors"
        >
          <span>←</span> Back to Tickets
        </button>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 text-white">
            <h1 className="text-3xl font-black mb-2">🎫 Ticket Management</h1>
            <p className="text-orange-100">{ticket.eventTitle}</p>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">Ticket ID</p>
                <p className="text-xl font-mono font-bold text-gray-900">{ticket.id}</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">Status</p>
                <p className="text-xl font-bold text-gray-900">
                  {ticket.used ? '✅ Used' : '🎫 Valid'}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">Location</p>
                <p className="text-xl font-bold text-gray-900">{ticket.location}</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <p className="text-gray-600 text-sm font-medium">Event Time</p>
                <p className="text-xl font-bold text-gray-900">{ticket.startTime}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
              >
                📥 Download Ticket
              </button>
              <button
                className="w-full px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-bold hover:bg-gray-300 transition-all"
              >
                🔗 Share Ticket
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
